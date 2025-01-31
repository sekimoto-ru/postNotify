const express = require('express');
const app = express();
const pool = require('./db'); // Assuming you have a db.js file for database connection

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.json());

// 教員情報の取得
app.get('/teachers/:id', async (req, res) => {
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
app.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, name, furigana, email, notification_paper, notification_email, notification_teams, teams_id, department FROM teachers ORDER BY furigana'
        );
        res.render('teachers', { teachers: rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('サーバーエラーが発生しました');
    }
});

// 教員情報の更新
app.put('/teachers/:id', async (req, res) => {
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
