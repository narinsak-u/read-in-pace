Nest] 42284  - 06/04/2026, 7:22:59 PM   ERROR [ExceptionsHandler] DrizzleQueryError: Failed query: select "id", "title", "author", "price", "cover", "synopsis", "category", "trending", "created_by", "created_at", "updated_at", (SELECT COUNT(*) FROM "likes" WHERE "book_id" = "id"), (SELECT COUNT(*) FROM "comments" WHERE "book_id" = "id"), COALESCE((SELECT AVG("rating") FROM "ratings" WHERE "book_id" = "id"), 0) from "books" order by "books"."created_at" desc limit $1
params: 12
    at NodePgPreparedQuery.queryWithCache (D:\Github\read-in-pace\backend\node_modules\src\pg-core\session.ts:73:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async <anonymous> (D:\Github\read-in-pace\backend\node_modules\src\node-postgres\session.ts:154:19)
    ... 2 lines matching cause stack trace ...
    at async D:\Github\read-in-pace\backend\node_modules\@nestjs\core\router\router-proxy.js:9:17 {
  query: 'select "id", "title", "author", "price", "cover", "synopsis", "category", "trending", "created_by", "created_at", "updated_at", (SELECT COUNT(*) FROM "likes" WHERE "book_id" = "id"), (SELECT COUNT(*) FROM "comments" WHERE "book_id" = "id"), COALESCE((SELECT AVG("rating") FROM "ratings" WHERE "book_id" = "id"), 0) from "books" order by "books"."created_at" desc limit $1',
  params: [
    12
  ],
  cause: error: relation "books" does not exist
      at D:\Github\read-in-pace\backend\node_modules\pg-pool\index.js:45:11
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async <anonymous> (D:\Github\read-in-pace\backend\node_modules\src\node-postgres\session.ts:161:13)
      at async NodePgPreparedQuery.queryWithCache (D:\Github\read-in-pace\backend\node_modules\src\pg-core\session.ts:71:12)
      at async <anonymous> (D:\Github\read-in-pace\backend\node_modules\src\node-postgres\session.ts:154:19)
      at async BooksService.findAll (D:\Github\read-in-pace\backend\src\books\books.service.ts:36:18)
      at async D:\Github\read-in-pace\backend\node_modules\@nestjs\core\router\router-execution-context.js:46:28
      at async D:\Github\read-in-pace\backend\node_modules\@nestjs\core\router\router-proxy.js:9:17 {
    length: 105,
    severity: 'ERROR',
    code: '42P01',
    detail: undefined,
    hint: undefined,
    position: '321',
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: 'parse_relation.c',
    line: '1449',
    routine: 'parserOpenTable'
  }
}
[Nest] 42284  - 06/04/2026, 7:23:07 PM   ERROR [ExceptionsHandler] DrizzleQueryError: Failed query: select "id", "title", "author", "price", "cover", "synopsis", "category", "trending", "created_by", "created_at", "updated_at", (SELECT COUNT(*) FROM "likes" WHERE "book_id" = "id"), (SELECT COUNT(*) FROM "comments" WHERE "book_id" = "id"), COALESCE((SELECT AVG("rating") FROM "ratings" WHERE "book_id" = "id"), 0) from "books" order by "books"."created_at" desc limit $1
params: 12
    at NodePgPreparedQuery.queryWithCache (D:\Github\read-in-pace\backend\node_modules\src\pg-core\session.ts:73:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async <anonymous> (D:\Github\read-in-pace\backend\node_modules\src\node-postgres\session.ts:154:19)
    ... 2 lines matching cause stack trace ...
    at async D:\Github\read-in-pace\backend\node_modules\@nestjs\core\router\router-proxy.js:9:17 {
  query: 'select "id", "title", "author", "price", "cover", "synopsis", "category", "trending", "created_by", "created_at", "updated_at", (SELECT COUNT(*) FROM "likes" WHERE "book_id" = "id"), (SELECT COUNT(*) FROM "comments" WHERE "book_id" = "id"), COALESCE((SELECT AVG("rating") FROM "ratings" WHERE "book_id" = "id"), 0) from "books" order by "books"."created_at" desc limit $1',
  params: [
    12
  ],
  cause: error: relation "books" does not exist
      at D:\Github\read-in-pace\backend\node_modules\pg-pool\index.js:45:11
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async <anonymous> (D:\Github\read-in-pace\backend\node_modules\src\node-postgres\session.ts:161:13)
      at async NodePgPreparedQuery.queryWithCache (D:\Github\read-in-pace\backend\node_modules\src\pg-core\session.ts:71:12)
      at async <anonymous> (D:\Github\read-in-pace\backend\node_modules\src\node-postgres\session.ts:154:19)
      at async BooksService.findAll (D:\Github\read-in-pace\backend\src\books\books.service.ts:36:18)
      at async D:\Github\read-in-pace\backend\node_modules\@nestjs\core\router\router-execution-context.js:46:28
      at async D:\Github\read-in-pace\backend\node_modules\@nestjs\core\router\router-proxy.js:9:17 {
    length: 105,
    severity: 'ERROR',
    code: '42P01',
    detail: undefined,
    hint: undefined,
    position: '321',
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: 'parse_relation.c',
    line: '1449',
    routine: 'parserOpenTable'
  }
}
[Nest] 42284  - 06/04/2026, 7:23:07 PM   ERROR [ExceptionsHandler] DrizzleQueryError: Failed query: select "id", "title", "author", "price", "cover", "synopsis", "category", "trending", "created_by", "created_at", "updated_at", (SELECT COUNT(*) FROM "likes" WHERE "book_id" = "id"), (SELECT COUNT(*) FROM "comments" WHERE "book_id" = "id"), COALESCE((SELECT AVG("rating") FROM "ratings" WHERE "book_id" = "id"), 0) from "books" order by COALESCE((SELECT AVG("ratings"."rating") FROM "ratings" WHERE "ratings"."book_id" = "books"."id"), 0) desc limit $1
params: 3
    at NodePgPreparedQuery.queryWithCache (D:\Github\read-in-pace\backend\node_modules\src\pg-core\session.ts:73:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async <anonymous> (D:\Github\read-in-pace\backend\node_modules\src\node-postgres\session.ts:154:19)
    at async D:\Github\read-in-pace\backend\node_modules\@nestjs\core\router\router-execution-context.js:46:28
    at async D:\Github\read-in-pace\backend\node_modules\@nestjs\core\router\router-proxy.js:9:17 {
  query: 'select "id", "title", "author", "price", "cover", "synopsis", "category", "trending", "created_by", "created_at", "updated_at", (SELECT COUNT(*) FROM "likes" WHERE "book_id" = "id"), (SELECT COUNT(*) FROM "comments" WHERE "book_id" = "id"), COALESCE((SELECT AVG("rating") FROM "ratings" WHERE "book_id" = "id"), 0) from "books" order by COALESCE((SELECT AVG("ratings"."rating") FROM "ratings" WHERE "ratings"."book_id" = "books"."id"), 0) desc limit $1',
  params: [
    3
  ],
  cause: error: relation "books" does not exist
      at D:\Github\read-in-pace\backend\node_modules\pg-pool\index.js:45:11
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async <anonymous> (D:\Github\read-in-pace\backend\node_modules\src\node-postgres\session.ts:161:13)
      at async NodePgPreparedQuery.queryWithCache (D:\Github\read-in-pace\backend\node_modules\src\pg-core\session.ts:71:12)
      at async <anonymous> (D:\Github\read-in-pace\backend\node_modules\src\node-postgres\session.ts:154:19)
      at async D:\Github\read-in-pace\backend\node_modules\@nestjs\core\router\router-execution-context.js:46:28
      at async D:\Github\read-in-pace\backend\node_modules\@nestjs\core\router\router-proxy.js:9:17 {
    length: 105,
    severity: 'ERROR',
    code: '42P01',
    detail: undefined,
    hint: undefined,
    position: '321',
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: 'parse_relation.c',
    line: '1449',
    routine: 'parserOpenTable'
  }
}
[Nest] 42284  - 06/04/2026, 7:23:21 PM   ERROR [ExceptionsHandler] DrizzleQueryError: Failed query: select "id", "title", "author", "price", "cover", "synopsis", "category", "trending", "created_by", "created_at", "updated_at", (SELECT COUNT(*) FROM "likes" WHERE "book_id" = "id"), (SELECT COUNT(*) FROM "comments" WHERE "book_id" = "id"), COALESCE((SELECT AVG("rating") FROM "ratings" WHERE "book_id" = "id"), 0) from "books" order by COALESCE((SELECT AVG("ratings"."rating") FROM "ratings" WHERE "ratings"."book_id" = "books"."id"), 0) desc limit $1
params: 3
    at NodePgPreparedQuery.queryWithCache (D:\Github\read-in-pace\backend\node_modules\src\pg-core\session.ts:73:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async <anonymous> (D:\Github\read-in-pace\backend\node_modules\src\node-postgres\session.ts:154:19)
    at async D:\Github\read-in-pace\backend\node_modules\@nestjs\core\router\router-execution-context.js:46:28
    at async D:\Github\read-in-pace\backend\node_modules\@nestjs\core\router\router-proxy.js:9:17 {
  query: 'select "id", "title", "author", "price", "cover", "synopsis", "category", "trending", "created_by", "created_at", "updated_at", (SELECT COUNT(*) FROM "likes" WHERE "book_id" = "id"), (SELECT COUNT(*) FROM "comments" WHERE "book_id" = "id"), COALESCE((SELECT AVG("rating") FROM "ratings" WHERE "book_id" = "id"), 0) from "books" order by COALESCE((SELECT AVG("ratings"."rating") FROM "ratings" WHERE "ratings"."book_id" = "books"."id"), 0) desc limit $1',
  params: [
    3
  ],
  cause: error: relation "books" does not exist
      at D:\Github\read-in-pace\backend\node_modules\pg-pool\index.js:45:11
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async <anonymous> (D:\Github\read-in-pace\backend\node_modules\src\node-postgres\session.ts:161:13)
      at async NodePgPreparedQuery.queryWithCache (D:\Github\read-in-pace\backend\node_modules\src\pg-core\session.ts:71:12)
      at async <anonymous> (D:\Github\read-in-pace\backend\node_modules\src\node-postgres\session.ts:154:19)
      at async D:\Github\read-in-pace\backend\node_modules\@nestjs\core\router\router-execution-context.js:46:28
      at async D:\Github\read-in-pace\backend\node_modules\@nestjs\core\router\router-proxy.js:9:17 {
    length: 105,
    severity: 'ERROR',
    code: '42P01',
    detail: undefined,
    hint: undefined,
    position: '321',
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: 'parse_relation.c',
    line: '1449',
    routine: 'parserOpenTable'
  }
}
[Nest] 42284  - 06/04/2026, 7:23:21 PM   ERROR [ExceptionsHandler] DrizzleQueryError: Failed query: select "id", "title", "author", "price", "cover", "synopsis", "category", "trending", "created_by", "created_at", "updated_at", (SELECT COUNT(*) FROM "likes" WHERE "book_id" = "id"), (SELECT COUNT(*) FROM "comments" WHERE "book_id" = "id"), COALESCE((SELECT AVG("rating") FROM "ratings" WHERE "book_id" = "id"), 0) from "books" order by "books"."created_at" desc limit $1
params: 12
    at NodePgPreparedQuery.queryWithCache (D:\Github\read-in-pace\backend\node_modules\src\pg-core\session.ts:73:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async <anonymous> (D:\Github\read-in-pace\backend\node_modules\src\node-postgres\session.ts:154:19)
    ... 2 lines matching cause stack trace ...
    at async D:\Github\read-in-pace\backend\node_modules\@nestjs\core\router\router-proxy.js:9:17 {
  query: 'select "id", "title", "author", "price", "cover", "synopsis", "category", "trending", "created_by", "created_at", "updated_at", (SELECT COUNT(*) FROM "likes" WHERE "book_id" = "id"), (SELECT COUNT(*) FROM "comments" WHERE "book_id" = "id"), COALESCE((SELECT AVG("rating") FROM "ratings" WHERE "book_id" = "id"), 0) from "books" order by "books"."created_at" desc limit $1',
  params: [
    12
  ],
  cause: error: relation "books" does not exist
      at D:\Github\read-in-pace\backend\node_modules\pg-pool\index.js:45:11
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async <anonymous> (D:\Github\read-in-pace\backend\node_modules\src\node-postgres\session.ts:161:13)
      at async NodePgPreparedQuery.queryWithCache (D:\Github\read-in-pace\backend\node_modules\src\pg-core\session.ts:71:12)
      at async <anonymous> (D:\Github\read-in-pace\backend\node_modules\src\node-postgres\session.ts:154:19)
      at async BooksService.findAll (D:\Github\read-in-pace\backend\src\books\books.service.ts:36:18)
      at async D:\Github\read-in-pace\backend\node_modules\@nestjs\core\router\router-execution-context.js:46:28
      at async D:\Github\read-in-pace\backend\node_modules\@nestjs\core\router\router-proxy.js:9:17 {
    length: 105,
    severity: 'ERROR',
    code: '42P01',
    detail: undefined,
    hint: undefined,
    position: '321',
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: 'parse_relation.c',
    line: '1449',
    routine: 'parserOpenTable'
  }
}

Request URL
http://localhost:3000/api/books?page=1&limit=12
Request Method
GET
Status Code
200 OK

{
  "statusCode": 500,
  "message": "Internal server error"
}