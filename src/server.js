const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const qrcode = require('qrcode');
const axios = require('axios');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

const app = express();
app.use(expressLayouts);
app.set('layout', 'layout');

// メール設定
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
const port = process.env.PORT || 3000;

// データベース接続
const db = new sqlite3.Database(path.join(__dirname, '../database/postnotify.db'), (err) => {
  if (err) {
    console.error('データベース接続エラー:', err);
  } else {
    console.log('データベースに接続しました');
  }
});

// ミドルウェアの設定
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// ルート
app.get('/', (req, res) => {
  res.render('index');
});

// 通知機能
async function sendNotifications(teacher, packageInfo) {
  const notifications = [];

  if (teacher.notification_email && teacher.email) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: teacher.email,
        subject: '新しい郵送物が届いています',
        text: `
${teacher.name}様

新しい郵送物が届いています。

詳細：
${packageInfo.description}
${packageInfo.requiresCart ? '※台車が必要です' : ''}

受け取りの際は以下のQRコードをご利用ください。
${process.env.BASE_URL}/packages/${packageInfo.id}/receive
`,
      });

      notifications.push({
        package_id: packageInfo.id,
        type: 'email',
        status: 'success'
      });
    } catch (error) {
      notifications.push({
        package_id: packageInfo.id,
        type: 'email',
        status: 'failed',
        error_message: error.message
      });
    }
  }

  if (teacher.notification_teams && teacher.teams_id) {
    try {
      await axios.post(process.env.TEAMS_WEBHOOK_URL, {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "summary": "新しい郵送物のお知らせ",
        "sections": [{
          "activityTitle": "新しい郵送物が届いています",
          "activitySubtitle": `${teacher.name}様宛`,
          "facts": [
            {
              "name": "詳細",
              "value": packageInfo.description
            },
            {
              "name": "台車",
              "value": packageInfo.requiresCart ? "必要" : "不要"
            }
          ],
          "potentialAction": [
            {
              "@type": "OpenUri",
              "name": "受け取り確認",
              "targets": [
                {
                  "os": "default",
                  "uri": `${process.env.BASE_URL}/packages/${packageInfo.id}/receive`
                }
              ]
            }
          ]
        }]
      });

      notifications.push({
        package_id: packageInfo.id,
        type: 'teams',
        status: 'success'
      });
    } catch (error) {
      notifications.push({
        package_id: packageInfo.id,
        type: 'teams',
        status: 'failed',
        error_message: error.message
      });
    }
  }

  // 通知履歴の保存
  notifications.forEach(notification => {
    db.run(
      'INSERT INTO notifications (package_id, type, status, error_message) VALUES (?, ?, ?, ?)',
      [notification.package_id, notification.type, notification.status, notification.error_message]
    );
  });

  return notifications;
}

// 教員一覧
app.get('/teachers', (req, res) => {
  db.all('SELECT * FROM teachers', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (req.headers.accept?.includes('application/json')) {
      res.json(rows);
    } else {
      res.render('teachers', { teachers: rows });
    }
  });
});

// 教員情報取得
app.get('/teachers/:id', (req, res) => {
  db.get('SELECT * FROM teachers WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: '教員が見つかりません' });
      return;
    }
    res.json(row);
  });
});

// 教員情報更新
app.put('/teachers/:id', (req, res) => {
  const { 
    name, 
    furigana, 
    email,
    notification_paper, 
    notification_email, 
    notification_teams, 
    teams_id,
    department
  } = req.body;
  
  db.run(
    `UPDATE teachers SET 
      name = ?,
      furigana = ?,
      email = ?,
      notification_paper = ?, 
      notification_email = ?, 
      notification_teams = ?, 
      teams_id = ? ,
      department = ?
    WHERE id = ?`,
    [name, furigana, email, notification_paper, notification_email, notification_teams, teams_id, department, req.params.id],
    (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true });
    }
  );
});

// 郵送物一覧
app.get('/packages', (req, res) => {
  db.all(`
    SELECT 
      p.*,
      t.name as teacher_name
    FROM packages p
    JOIN teachers t ON p.teacher_id = t.id
    ORDER BY p.created_at DESC
  `, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.render('packages', { packages: rows });
  });
});

// 郵送物用紙
app.get('/packages/:id/paper', async (req, res) => {
  try {
    // 郵送物情報の取得
    const package = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          p.*,
          t.name as teacher_name
        FROM packages p
        JOIN teachers t ON p.teacher_id = t.id
        WHERE p.id = ?
      `, [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!package) {
      res.status(404).send('郵送物が見つかりません');
      return;
    }

    // QRコードの生成
    package.qr_code = await qrcode.toDataURL(`${process.env.BASE_URL}/packages/${package.id}/receive`);

    res.render('paper', { package });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 郵送物詳細
app.get('/packages/:id', async (req, res) => {
  try {
    // 郵送物情報の取得
    const package = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          p.*,
          t.name as teacher_name
        FROM packages p
        JOIN teachers t ON p.teacher_id = t.id
        WHERE p.id = ?
      `, [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!package) {
      res.status(404).send('郵送物が見つかりません');
      return;
    }

    // QRコードの再生成
    package.qr_code = await qrcode.toDataURL(`${process.env.BASE_URL}/packages/${package.id}/receive`);

    // 通知履歴の取得
    const notifications = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM notifications WHERE package_id = ? ORDER BY created_at DESC', [req.params.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.render('package-detail', { 
      package: package,
      notifications: notifications
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 郵送物登録
app.post('/packages', async (req, res) => {
  const { teacherId, description, requiresCart } = req.body;
  
  try {
    // 郵送物情報の保存
    db.run(
      'INSERT INTO packages (teacher_id, description, requires_cart, status) VALUES (?, ?, ?, ?)',
      [teacherId, description, requiresCart, 'pending'],
      async function(err) {
        if (err) {
          throw err;
        }

        const packageId = this.lastID;
        const packageInfo = {
          id: packageId,
          description,
          requiresCart
        };
        
        // QRコード生成
        const qrData = await qrcode.toDataURL(`${process.env.BASE_URL}/packages/${packageId}/receive`);
        
        // 教員情報の取得と通知送信
        db.get('SELECT * FROM teachers WHERE id = ?', [teacherId], async (err, teacher) => {
          if (err) {
            throw err;
          }

          // 用紙通知が有効な場合は通知履歴に追加
          if (teacher.notification_paper) {
            db.run(
              'INSERT INTO notifications (package_id, type, status) VALUES (?, ?, ?)',
              [packageId, 'paper', 'success']
            );
          }

          // その他の通知を送信
          await sendNotifications(teacher, packageInfo);

          res.json({ 
            success: true, 
            packageId,
            showPaper: teacher.notification_paper
          });
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 受取確認
app.post('/packages/:id/receive', (req, res) => {
  const { id } = req.params;
  
  db.run(
    'UPDATE packages SET status = ?, received_at = DATETIME("now") WHERE id = ?',
    ['received', id],
    (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true });
    }
  );
});

app.listen(port, () => {
  console.log(`サーバーが http://localhost:${port} で起動しました`);
});
