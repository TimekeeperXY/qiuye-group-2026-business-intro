# 秋叶集团动态企业介绍 HTML 页面库

## 目录结构
- `index.html`：商务页面库/组合器
- `present.html`：组合播放模式，支持浏览器本地保存组合方案和音频缓存
- `shared/local-library.js`：IndexedDB 本地方案与音频缓存模块
- `tts_server.py`：本地静态文件与 MiMo TTS 服务
- `01_集团与高校服务总览`：P1-P4
- `02_教师数字素养培训`：P5-P41，继续按课程体系、高校案例、中小学幼教、高校联合社会培训拆分
- `03_AI产教融合专业共建`：P42-P74，继续按教材、资源库、智能体、微专业、实训基地拆分
- `04_重大成果材料美化`：P75-P85
- `05_联系与结束`：P86
- `narration.json`：86页逐页解说词
- `generate_audio.py`：调用 MiMo-V2.5-TTS 批量生成 WAV
- `shared/pdf-slides/`：由原版 PDF 渲染出的 86 张页面底图，HTML 页面以此作为稳定视觉层，避免 PPT 导出对象在浏览器中发生字体替换和内容重叠

## 本地预览
Windows 双击 `启动本地预览.bat`，浏览器打开 `http://localhost:8000`。该启动脚本同时提供本地 MiMo TTS 接口，API Key 只从系统环境变量读取。
不要直接双击 index.html，因为浏览器对本地 `fetch()` 有安全限制。

## 生成 MiMo 解说音频
本项目不会把 API Key 写进 HTML 或打包文件。请在终端临时设置环境变量：

Windows PowerShell：
```powershell
$env:MIMO_API_KEY="你的Key"
python generate_audio.py
```

macOS / Linux：
```bash
export MIMO_API_KEY="你的Key"
python3 generate_audio.py
```

单独重做某一页：`python generate_audio.py --page 18 --overwrite`

默认模型 `mimo-v2.5-tts`，Base URL `https://api.xiaomimimo.com/v1`，默认中文女声 `冰糖`。

## 商务重新组合
打开 `index.html` 所在站点，在页面库中按板块筛选并勾选任意页面，点击“进入组合播放”。组合顺序默认按勾选顺序，可直接形成面向不同客户的短版介绍。

进入组合播放后，点击“方案与音频”可以保存当前组合。方案、页面顺序、页面文案版本以及新生成的 WAV 音频会保存在当前浏览器的 IndexedDB 中。音频缓存按“组合方案签名 + 页面位置 + 音色模式 + 音色参数 + 语气 + 文案版本”区分，因此不同组合不会互相覆盖；删除方案时默认保留音频缓存，方便后续复用。

音色模式支持：MiMo 预置音色、通过文字描述生成音色、上传 MP3/WAV 参考音频进行音色克隆。参考音频本身也只保存在当前浏览器的 IndexedDB 中；本地 TTS 服务会在生成时读取它并发送给 MiMo，不会把 API Key 暴露给前端。

## 部署
整个目录可直接放到任意静态网站服务器（Nginx、GitHub Pages、对象存储静态站点等）。已经生成好的音频放在 `shared/audio/` 中即可。
