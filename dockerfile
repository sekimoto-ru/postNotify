# ベースイメージとして公式Node.jsイメージを使用
FROM node:lts

# アプリケーションディレクトリを作成
WORKDIR /usr/src/app

# node_modulesディレクトリを削除
RUN rm -rf node_modules

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 必要なパッケージをインストール
RUN npm install

# アプリケーションコードをコピー
COPY . .

# init.jsを実行してデータベースを初期化
RUN node database/init.js

# コンテナがリッスンするポートを定義
EXPOSE 3000

# アプリケーションを起動
CMD ["npm", "start"]