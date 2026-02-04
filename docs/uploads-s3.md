## Image Uploads via AWS S3

Endpoint: `POST /api/uploads/image`

- Auth: protected; requires a valid token and edit permission.
- Body: `multipart/form-data` with a file field `image`.
- Response: `{ url, key, bucket, contentType }`.

Env variables required:

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET`

Optional:

- `S3_PUBLIC_BASE_URL` – custom CDN/base URL for returned `url`
- `S3_KEY_PREFIX` – defaults to `uploads/images/`
- `S3_OBJECT_ACL` – defaults to `public-read`
- `MAX_UPLOAD_BYTES` – defaults to 10MB

Example:

```
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F image=@/path/to/photo.jpg \
  http://localhost:4000/api/uploads/image
```

