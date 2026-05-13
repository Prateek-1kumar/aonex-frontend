const fs = require('fs');
const file = '/Users/prateekkumar/aonex-backend/apps/api/src/middleware/auth.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'import type { MiddlewareHandler } from "hono";',
  'import type { MiddlewareHandler } from "hono";\nimport { getCookie } from "hono/cookie";'
);

content = content.replace(
  'const auth = c.req.header("authorization");\n    if (!auth?.startsWith("Bearer ")) {\n      return c.json({ error: { code: "UNAUTHENTICATED", message: "Missing bearer token" } }, 401);\n    }\n    const token = auth.slice("Bearer ".length).trim();',
  'const auth = c.req.header("authorization");\n    const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : getCookie(c, "aonex_token");\n    if (!token) {\n      return c.json({ error: { code: "UNAUTHENTICATED", message: "Missing bearer token" } }, 401);\n    }'
);

fs.writeFileSync(file, content);
console.log('Fixed backend');
