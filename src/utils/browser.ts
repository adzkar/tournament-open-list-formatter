export const getIsSafari = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // Detect Safari (exclude Chrome, Edge, Opera, Firefox, including iOS variants)
  return /Safari/i.test(ua) && !/(Chrome|CriOS|Edg|OPR|Firefox)/i.test(ua);
};
