# ベースイメージとして公式Node.jsイメージを使用
FROM node:lts

# アプリケーションディレクトリを作成
WORKDIR /usr/src/app

# node_modulesディレクトリを削除
RUN rm -rf node_modules

# /databaseにpostnotify.dbがない場合はinit.jsを実行
RUN test -f /database/postnotify.db || node init.js

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 必要なパッケージをインストール
RUN npm install

# アプリケーションコードをコピー
COPY . .

# コンテナがリッスンするポートを定義
EXPOSE 3000

# アプリケーションを起動
CMD ["npm", "start"]
# CMD ["node", "server.js"]