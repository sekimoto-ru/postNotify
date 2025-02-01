# 教員通知管理システム

このプロジェクトは、教員の通知設定を管理し、郵送物の登録と通知を行うためのシステムです。

## 構成

### サーバーサイド

- `server.js`: Expressサーバーのエントリーポイント。教員情報の取得、更新、郵送物の登録などのAPIエンドポイントを提供します。
- `.env`: 環境変数を設定するファイル。
- `Dockerfile`: Dockerイメージのビルド設定。

### フロントエンド

- `views/teachers.ejs`: 教員一覧ページのテンプレート。
- `views/index.ejs`: 郵送物登録ページのテンプレート。
- `views/packages.ejs`: 郵送物一覧ページのテンプレート。
- `views/package-detail.ejs`: 郵送物詳細ページのテンプレート。

## セットアップ

### 必要なツール

- Node.js
- Docker
- Docker Compose

### 手順

1. リポジトリをクローンします。

    ```bash
    git clone <リポジトリのURL>
    cd <リポジトリのディレクトリ>
    ```

2. 必要なパッケージをインストールします。

    ```bash
    npm install
    ```

3. 環境変数を設定します。`.env`ファイルを作成し、以下の内容を記述します。

    ```env
    # アプリケーション設定
    PORT=3000
    BASE_URL=http://localhost:3000
    BASE_PATH="/rdx/post-notify"

    # メール設定（開発用ダミー設定）
    SMTP_HOST=smtp.mailtrap.io
    SMTP_PORT=2525
    SMTP_USER=test
    SMTP_PASS=test
    SMTP_FROM=noreply@example.com

    # Teams設定（実際のWebhook URLに置き換えが必要）
    TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...

    # データベース設定
    DB_PATH=database/postnotify.db

    ```

4. Dockerコンテナーをビルドして起動します。

    ```bash
    docker build -t post-notify .
    docker run -p 3000:3000 --name post-notify post-notify
    ```

5. ブラウザで`http://localhost:3000`にアクセスします。

## 使用方法

### 教員一覧の表示

- URL: `/teachers`
- メソッド: GET
- 説明: 教員の一覧を表示します。

### 教員情報の取得

- URL: `/teachers/:id`
- メソッド: GET
- 説明: 指定したIDの教員情報を取得します。

### 教員情報の更新

- URL: `/teachers/:id`
- メソッド: PUT
- 説明: 指定したIDの教員情報を更新します。

### 郵送物の登録

- URL: `/packages`
- メソッド: POST
- 説明: 新しい郵送物を登録します。

### 郵送物一覧の表示

- URL: `/packages`
- メソッド: GET
- 説明: 登録された郵送物の一覧を表示します。

### 郵送物詳細の表示

- URL: `/packages/:id`
- メソッド: GET
- 説明: 指定したIDの郵送物の詳細を表示します。

## 注意事項
現在はまだ開発中のため以下のような問題があります。

- dockerイメージを作成する際に、データベースをinitしています
- 登録教員数が増えると、プルダウンでは選択が難しくなります（代替案を思案中）
- QRコード読み取り機能は未実装です
- 教員への通知（mail, Teams）機能は未実装です
- システム自体の認証等は未実装です

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
