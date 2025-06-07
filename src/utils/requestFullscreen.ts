export const requestFullscreen = () => {
  if ((window as any)["electronRequestFullscreen"]) {
    void (window as any).electronRequestFullscreen();
  } else {
    document.body.requestFullscreen().catch(console.error);
  }
};
