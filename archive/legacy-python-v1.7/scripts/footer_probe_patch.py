from pathlib import Path
p=Path(r"C:\Users\USER\Downloads\Compressed\NexusLauncher_v1.6.7_STARTUP_SFX_SYNC\backend\main.py")
s=p.read_text(encoding='utf-8')
old="""  const boot = document.getElementById('nexus-boot');
  const style = root ? getComputedStyle(root) : null;
  const appStyle = app ? getComputedStyle(app) : null;
  return {
"""
new="""  const boot = document.getElementById('nexus-boot');
  const footer = document.getElementById('nexus-console-footer');
  const style = root ? getComputedStyle(root) : null;
  const appStyle = app ? getComputedStyle(app) : null;
  const footerStyle = footer ? getComputedStyle(footer) : null;
  const footerRect = footer ? footer.getBoundingClientRect() : null;
  return {
"""
s=s.replace(old,new,1)
s=s.replace("""    appVisibility: appStyle ? appStyle.visibility : '', appDisplay: appStyle ? appStyle.display : ''
  };
""","""    appVisibility: appStyle ? appStyle.visibility : '', appDisplay: appStyle ? appStyle.display : '',
    hasFooter: !!footer, footerDisplay: footerStyle ? footerStyle.display : '',
    footerVisibility: footerStyle ? footerStyle.visibility : '',
    footerRect: footerRect ? [footerRect.left, footerRect.top, footerRect.width, footerRect.height] : []
  };
""",1)
p.write_text(s,encoding='utf-8')
print('footer probe added')
