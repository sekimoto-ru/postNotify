const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'postnotify.db'), (err) => {
  if (err) {
    console.error('データベース作成エラー:', err);
  } else {
    console.log('データベースが作成されました');
    initDatabase();
  }
});

function initDatabase() {
  // 教員テーブル
  db.run(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      furigana TEXT,
      email TEXT,
      notification_email BOOLEAN DEFAULT false,
      notification_teams BOOLEAN DEFAULT false,
      notification_paper BOOLEAN DEFAULT true,
      teams_id TEXT,
      department TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 郵送物テーブル
  db.run(`
    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER,
      description TEXT NOT NULL,
      requires_cart BOOLEAN DEFAULT false,
      status TEXT CHECK(status IN ('pending', 'received')) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      received_at DATETIME,
      FOREIGN KEY (teacher_id) REFERENCES teachers (id)
    )
  `);

  // 通知履歴テーブル
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER,
      type TEXT CHECK(type IN ('email', 'teams', 'paper')) NOT NULL,
      status TEXT CHECK(status IN ('success', 'failed')) NOT NULL,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (package_id) REFERENCES packages (id)
    )
  `, (err) => {
    if (err) {
      console.error('テーブル作成エラー:', err);
    } else {
      console.log('テーブルが作成されました');
      // サンプルデータの挿入
      insertSampleData();
    }
  });
}

function insertSampleData() {
  // サンプル教員データ
  const sampleTeachers = [
    ['山田太郎', 'やまだたろう', 'yamada@example.com', true, false, true, null, '工学部'],
    ['鈴木花子', 'すずきはなこ', 'suzuki@example.com', true, true, true, 'suzuki_teams_id', '医学部'],
    ['佐藤一郎', 'さとういちろう', 'sato@example.com', false, true, true, 'sato_teams_id', '理学部']
  ];

  sampleTeachers.forEach(teacher => {
    db.run(
      'INSERT INTO teachers (name, furigana, email, notification_email, notification_teams, notification_paper, teams_id, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      teacher,
      function(err) {
        if (err) {
          console.error('サンプルデータ挿入エラー:', err);
        }
      }
    );
  });

  console.log('サンプルデータが挿入されました');
  db.close();
}
