const express = require('express');
const app = express();
const pool = require('./db');

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.json());

// ベースパスの設定（環境変数から取得するか、デフォルト値を使用）
const BASE_PATH = process.env.BASE_PATH || '/';

// ベースパスのための変数をすべてのテンプレートで利用可能にする
app.use((req, res, next) => {
    res.locals.basePath = BASE_PATH;
    next();
});

// 教員情報の取得
app.get(`${BASE_PATH}/teachers/:id`, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, name, furigana, email, notification_paper, notification_email, notification_teams, teams_id, department FROM teachers WHERE id = $1',
            [req.params.id]
        );
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// 教員一覧の取得
app.get(`${BASE_PATH}/`, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, name, furigana, email, notification_paper, notification_email, notification_teams, teams_id, department FROM teachers ORDER BY furigana'
        );
        res.render('teachers', { 
            teachers: rows,
            basePath: BASE_PATH
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('サーバーエラーが発生しました');
    }
});

// 教員情報の更新
app.put(`${BASE_PATH}/teachers/:id`, async (req, res) => {
    try {
        const { name, furigana, email, notification_paper, notification_email, notification_teams, teams_id, department } = req.body;
        await pool.query(
            'UPDATE teachers SET name = $1, furigana = $2, email = $3, notification_paper = $4, notification_email = $5, notification_teams = $6, teams_id = $7, department = $8 WHERE id = $9',
            [name, furigana, email, notification_paper, notification_email, notification_teams, teams_id, department, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
