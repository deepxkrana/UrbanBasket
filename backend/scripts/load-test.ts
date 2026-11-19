import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import { RedisService } from '../src/services/redis.service';
import { ProductStatus } from '@prisma/client';

interface BenchmarkResult {
  endpoint: string;
  totalRequests: number;
  concurrency: number;
  successfulRequests: number;
  failedRequests: number;
  durationMs: number;
  rps: number;
  minLatencyMs: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  maxLatencyMs: number;
  cacheHitRatio: string;
}

const mockProducts = [
  {
    id: 'prod-001',
    name: 'Wireless ANC Headphones',
    slug: 'wireless-anc-headphones',
    description: 'High-fidelity audio with active noise canceling',
    price: 179.99,
    stock: 25,
    status: ProductStatus.PUBLISHED,
    averageRating: 4.8,
    category: { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
    vendor: { id: 'vend-1', storeName: 'TechStore', storeSlug: 'techstore' },
    images: [{ id: 'img-1', publicUrl: 'https://example.com/img1.jpg', position: 0 }],
    reviews: [],
  },
  {
    id: 'prod-002',
    name: 'Mechanical Gaming Keyboard',
    slug: 'mechanical-gaming-keyboard',
    description: 'RGB mechanical switches with ergonomic palm rest',
    price: 129.50,
    stock: 40,
    status: ProductStatus.PUBLISHED,
    averageRating: 4.6,
    category: { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
    vendor: { id: 'vend-1', storeName: 'TechStore', storeSlug: 'techstore' },
    images: [{ id: 'img-2', publicUrl: 'https://example.com/img2.jpg', position: 0 }],
    reviews: [],
  },
];

async function runBenchmark(
  endpoint: string,
  totalRequests: number = 100,
  concurrency: number = 10
): Promise<BenchmarkResult> {
  const latencies: number[] = [];
  let successful = 0;
  let failed = 0;
  let cacheHits = 0;

  // In-memory Redis simulation for benchmarking warm vs cold
  const cacheStore = new Map<string, string>();
  (RedisService.getCache as any) = async (key: string) => {
    if (cacheStore.has(key)) {
      cacheHits++;
      return JSON.parse(cacheStore.get(key)!);
    }
    return null;
  };
  (RedisService.setCache as any) = async (key: string, val: any) => {
    cacheStore.set(key, JSON.stringify(val));
    return true;
  };

  // Mock Prisma database reads for isolated backend throughput measurement
  (prisma.product.count as any) = async () => mockProducts.length;
  (prisma.product.findMany as any) = async () => mockProducts;

  const startTime = Date.now();

  const executeBatch = async (batchSize: number) => {
    const promises = Array.from({ length: batchSize }).map(async () => {
      const reqStart = Date.now();
      try {
        const res = await request(app).get(endpoint);
        const reqDuration = Date.now() - reqStart;
        latencies.push(reqDuration);
        if (res.status === 200 && (res.body.success || res.body.status === 'ok')) {
          successful++;
        } else {
          failed++;
        }
      } catch (err) {
        failed++;
        latencies.push(Date.now() - reqStart);
      }
    });
    await Promise.all(promises);
  };

  const batches = Math.ceil(totalRequests / concurrency);
  for (let i = 0; i < batches; i++) {
    const batchSize = Math.min(concurrency, totalRequests - i * concurrency);
    await executeBatch(batchSize);
  }

  const durationMs = Date.now() - startTime;
  latencies.sort((a, b) => a - b);

  const minLatencyMs = latencies[0] || 0;
  const maxLatencyMs = latencies[latencies.length - 1] || 0;
  const avgLatencyMs = latencies.reduce((acc, curr) => acc + curr, 0) / (latencies.length || 1);
  const p50LatencyMs = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95LatencyMs = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99LatencyMs = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const rps = (totalRequests / (durationMs / 1000));
  const cacheHitRatio = `${((cacheHits / totalRequests) * 100).toFixed(1)}%`;

  return {
    endpoint,
    totalRequests,
    concurrency,
    successfulRequests: successful,
    failedRequests: failed,
    durationMs,
    rps: Math.round(rps * 10) / 10,
    minLatencyMs,
    avgLatencyMs: Math.round(avgLatencyMs * 10) / 10,
    p50LatencyMs,
    p95LatencyMs,
    p99LatencyMs,
    maxLatencyMs,
    cacheHitRatio,
  };
}

async function main() {
  console.log('===============================================================');
  console.log('       UrbanBasket Phase 10: API Load Test & Benchmarking      ');
  console.log('===============================================================\n');

  const endpoints = [
    '/api/v1/products',
    '/api/v1/products?category=electronics&sort=price&order=asc',
    '/api/health',
  ];

  const results: BenchmarkResult[] = [];

  for (const ep of endpoints) {
    console.log(`Running benchmark on [${ep}] (100 requests, concurrency: 10)...`);
    const res = await runBenchmark(ep, 100, 10);
    results.push(res);
  }

  console.log('\n---------------------------------------------------------------');
  console.log('BENCHMARK SUMMARY RESULTS:');
  console.log('---------------------------------------------------------------');
  console.table(
    results.map((r) => ({
      Endpoint: r.endpoint,
      Reqs: r.totalRequests,
      Concurrency: r.concurrency,
      'Success Rate': `${((r.successfulRequests / r.totalRequests) * 100).toFixed(1)}%`,
      RPS: r.rps,
      'Avg (ms)': r.avgLatencyMs,
      'p50 (ms)': r.p50LatencyMs,
      'p95 (ms)': r.p95LatencyMs,
      'p99 (ms)': r.p99LatencyMs,
      'Cache Hit': r.cacheHitRatio,
    }))
  );
  console.log('---------------------------------------------------------------\n');
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
