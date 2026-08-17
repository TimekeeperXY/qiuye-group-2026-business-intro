# 秋叶集团动态企业介绍 HTML 页面库

## 目录结构
- `index.html`：商务页面库/组合器
- `present.html`：组合播放模式
- `01_集团与高校服务总览`：P1-P4
- `02_教师数字素养培训`：P5-P41，继续按课程体系、高校案例、中小学幼教、高校联合社会培训拆分
- `03_AI产教融合专业共建`：P42-P74，继续按教材、资源库、智能体、微专业、实训基地拆分
- `04_重大成果材料美化`：P75-P85
- `05_联系与结束`：P86
- `narration.json`：86页逐页解说词
- `generate_audio.py`：调用 MiMo-V2.5-TTS 批量生成 WAV
- `shared/pdf-slides/`：由原版 PDF 渲染出的 86 张页面底图，HTML 页面以此作为稳定视觉层，避免 PPT 导出对象在浏览器中发生字体替换和内容重叠

## 本地预览
Windows 双击 `启动本地预览.bat`，浏览器打开 `http://localhost:8000`。
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

## 部署
整个目录可直接放到任意静态网站服务器（Nginx、GitHub Pages、对象存储静态站点等）。已经生成好的音频放在 `shared/audio/` 中即可。
