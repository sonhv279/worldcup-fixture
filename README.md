# Lich thi dau World Cup 2026

Website tinh gon de theo doi lich 104 tran FIFA World Cup 2026 theo gio Viet Nam (`Asia/Ho_Chi_Minh`), kem thong tin san van dong va bo loc lich thi dau.

## Tinh nang

- Hien thi 104 tran theo ngay/gio Viet Nam.
- Bo loc theo ngay, vong dau, bang, san, quoc gia dang cai va tim kiem nhanh.
- Khu "Tran gan nhat" de xem tran sap dien ra.
- Tab "San van dong" gom 16 san, thanh pho/quoc gia va danh sach tran tai tung san.
- Du lieu cache tu FIFA API vao `data/worldcup-2026.json`.
- Ho tro mo truc tiep `index.html` bang Chrome nho file cache `data/worldcup-2026.js`.

## Yeu cau

- Node.js 18 tro len.
- Khong can cai them dependency npm.

## Chay local

```bash
npm run dev
```

Mac dinh server se chay tai:

```text
http://localhost:5173
```

Neu port `5173` ban, script se tu chon port tiep theo.

## Cap nhat du lieu FIFA

```bash
npm run sync
```

Lenh nay goi FIFA API chinh thuc va tao lai:

- `data/worldcup-2026.json`
- `data/worldcup-2026.js`

Nguon du lieu:

- FIFA fixtures: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures
- Matches API: https://api.fifa.com/api/v3/calendar/matches?idSeason=285023&language=en&count=200
- Seasons API: https://api.fifa.com/api/v3/seasons?idCompetition=17&language=en&count=20

## Kiem tra du lieu

```bash
npm run check
```

Script se validate:

- 104 tran dau
- 16 san van dong
- Du so tran theo vong: vong bang, round of 32, round of 16, tu ket, ban ket, tranh hang ba, chung ket
- Timezone `Asia/Ho_Chi_Minh`

## Cau truc du an

```text
.
├── index.html
├── styles.css
├── app.js
├── assets/
│   └── world-cup-2026-logo.png
├── data/
│   ├── worldcup-2026.json
│   └── worldcup-2026.js
└── scripts/
    ├── sync-fifa.mjs
    ├── check-data.mjs
    └── serve.mjs
```

## Luu y

- Khi mo truc tiep bang `file://`, trinh duyet co the chan `fetch()` file JSON. Vi vay website load `data/worldcup-2026.js` truoc de van hien thi du lieu.
- De cap nhat lich moi nhat, chay lai `npm run sync`.
- Website nay khong bao gom dang nhap, dat ve, streaming hay notification.
