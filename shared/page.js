
const audio=document.getElementById('narration'),btn=document.getElementById('audioBtn'),sp=document.getElementById('scriptPanel'),sb=document.getElementById('scriptBtn'),slide=document.getElementById('slideCanvas');
const pageNumber=Number(window.PAGE_META?.page||document.querySelector('.page-no')?.textContent?.match(/\d+/)?.[0]||0);
if(slide&&audio){
  const audioSrc=audio.getAttribute('src')||'';
  const pdfSrc=audioSrc.replace(/shared\/audio\/page-\d+\.wav$/i,`shared/pdf-slides/page-${String(pageNumber).padStart(3,'0')}.png`);
  if(pdfSrc!==audioSrc){
    slide.style.backgroundImage=`url("${pdfSrc}")`;
    slide.setAttribute('role','img');
    slide.setAttribute('aria-label',window.PAGE_META?.title||`第${pageNumber}页`);
    slide.dataset.referenceLayer='pdf';
  }
}
if(btn){btn.addEventListener('click',()=>{if(!audio)return;if(audio.paused){audio.play().then(()=>btn.textContent='❚❚ 暂停').catch(()=>{btn.textContent='未生成音频';sp?.classList.add('show')})}else{audio.pause();btn.textContent='▶ 解说'}})}
if(audio){audio.addEventListener('ended',()=>btn.textContent='▶ 解说');audio.addEventListener('error',()=>btn.textContent='生成音频')}
if(sb)sb.addEventListener('click',()=>sp?.classList.toggle('show'));
document.addEventListener('keydown',e=>{if(e.key===' '){e.preventDefault();btn?.click()}if(e.key.toLowerCase()==='s')sp?.classList.toggle('show')});
