# 現場スケジュール管理システム（Netlify本番版）

Claude.aiのチャット内アーティファクトとして作っていたツールを、Netlify上で
単体のWebアプリとして動くように作り直したものです。

## 変更点（Claude.ai版との違い）

- データ保存：`window.storage`（Claude.ai専用機能）→ **Netlify Blobs**（Netlify Functions経由）
- AIチャット：ブラウザから直接 `api.anthropic.com` を呼ぶ方式 → **Netlify Functions + Netlify AI Gateway**
  経由に変更。Netlify上にデプロイすると、Netlifyが自動でAnthropicのAPIキーを発行・注入してくれるため、
  **自分でAnthropicのAPIキーを取得する必要はありません**（Netlifyの無料プランの範囲で利用できます）。

## デプロイ手順

### 方法A：Netlifyダッシュボードにドラッグ＆ドロップ（一番簡単）

1. このフォルダをZIPにするか、そのままの状態で用意する
2. https://app.netlify.com にログイン → 既存サイト「lifemarks-calendar」の管理画面を開く
3. 「Deploys」タブ → フォルダをそのままドラッグ＆ドロップ
4. 数十秒でデプロイが完了します

### 方法B：Netlify CLIを使う

```bash
npm install -g netlify-cli
cd (このフォルダ)
netlify login
netlify link   # 既存の lifemarks-calendar サイトを選択
netlify deploy --prod
```

### 方法C：GitHubリポジトリ経由（継続的にアップデートしていく場合はこれがおすすめ）

1. このフォルダをGitHubリポジトリにpush
2. Netlifyダッシュボード → サイト設定 → 「Link repository」でそのリポジトリと連携
3. 以降は `git push` するだけで自動デプロイされます

継続的に機能を追加していく場合は、Claude Codeを使うとこのフォルダをそのまま
プロジェクトとして開いて編集・デプロイまで一気通貫で行えるのでおすすめです。

## 動作確認

デプロイ後、サイトを開いて以下を確認してください。

- 人員やカテゴリを登録して、ページを再読み込みしてもデータが残っているか（Blobsへの保存確認）
- 「AIチャットで案件登録」タブでメッセージを送り、返答が返ってくるか（AI Gatewayの動作確認）

もしAIチャットでエラーが出る場合は、Netlifyダッシュボードの
「Site configuration」→「Environment variables」で `ANTHROPIC_API_KEY` が
勝手に上書きされていないか、チームの「AI Gateway」設定が無効化されていないかを確認してください。

## データについて

- 現在はログイン機能がなく、このURLを開いた人は全員同じデータを見る・編集できる「共有ノート」のような
  仕組みです。社外に公開したくない場合は、Netlifyの「Password Protection」機能などでサイト全体に
  アクセス制限をかけることをおすすめします。
- 複数人が同時に同じ項目を編集すると、後から保存した内容で上書きされます（同時編集の競合制御はありません）。
