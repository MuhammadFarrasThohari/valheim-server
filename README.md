# Valheim Admin

Web admin berbasis JavaScript untuk menjalankan Valheim Dedicated Server Linux.

```bash
npm install
cp .env.example .env
npm run dev
```

Buka `http://localhost:5173`. Express berjalan pada port `3000` dan Vite pada port `5173`.

Untuk mode production lokal:

```bash
npm run build
npm start
```

Kemudian buka `http://localhost:3000`.

## Docker

```bash
docker build -t valheim-admin:latest .

docker run -d \
  --name valheim-admin \
  --restart unless-stopped \
  -p 3000:3000/tcp \
  -p 2456-2458:2456-2458/udp \
  -v valheim-data:/data \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD='replace-with-a-long-random-password' \
  -e VALHEIM_NAME='My server' \
  -e VALHEIM_WORLD=Dedicated \
  -e VALHEIM_PASSWORD='secret' \
  valheim-admin:latest
```

Buka `http://alamat-server:3000`. Jangan deploy tanpa `ADMIN_USERNAME` dan `ADMIN_PASSWORD` jika port web dapat diakses dari jaringan.

World dan konfigurasi disimpan dalam volume `valheim-data`, sehingga tetap ada ketika container atau image diganti.
