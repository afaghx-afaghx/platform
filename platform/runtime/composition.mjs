import { createCanonicalRuntime } from "../Gateway/runtime.mjs";
import { createPostgresDomainAdapter } from "../../domains/runtime/postgres-adapter.mjs";
import { createProductQuery } from "../../domains/product/product-query.mjs";

export function createPlatformRuntime({ pool, allowedOrigins = [], audit, search } = {}) {
  const productRepository = pool ? createPostgresDomainAdapter(pool, "product") : null;
  const productQuery = productRepository ? createProductQuery({ repository: productRepository }) : null;
  return createCanonicalRuntime({
    pool,
    allowedOrigins,
    audit,
    search,
    productQuery
  });
}
