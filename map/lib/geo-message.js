// 位置情報エラーの案内文を返す関数
export function geoErrorMessage(code) {
  if (code === 1) return permissionHelp(navigator.userAgent);
  if (code === 3) return '現在地の取得に時間がかかっています。もう一度「📍 現在地を取得」を押してください。';
  return '現在地を取得できませんでした。端末の位置情報がオンか確認してください。';
}

// アプリ・ブラウザごとの位置情報の設定場所を返す関数
function permissionHelp(ua) {
  if (/Line\//.test(ua)) {
    return '位置情報が許可されていません。LINEの設定で位置情報を許可するか、右上のメニューから「ブラウザで開く」を選んでください。';
  }
  if (/CriOS\//.test(ua)) {
    return '位置情報が許可されていません。iPhoneの 設定 > アプリ > Chrome > 位置情報 を「このAppの使用中のみ許可」にしてください。';
  }
  if (/GSA\//.test(ua)) {
    return '位置情報が許可されていません。iPhoneの 設定 > アプリ > Google > 位置情報 を「このAppの使用中のみ許可」にしてください。';
  }
  if (/iPhone|iPad/.test(ua)) {
    return '位置情報が許可されていません。設定 > プライバシーとセキュリティ > 位置情報サービス > Safari Webサイト を「使用中のみ許可」にしてください。';
  }
  return '位置情報が許可されていません。ブラウザのサイト設定で位置情報を許可してください。';
}

// 開いた時点で現在地が使えないか調べる関数
export async function geoUnavailableMessage() {
  if (!window.isSecureContext || !navigator.geolocation) {
    return 'このページでは現在地を使えません（HTTPSで開いてください）。';
  }
  try {
    const st = await navigator.permissions?.query({ name: 'geolocation' });
    if (st?.state === 'denied') return geoErrorMessage(1);
  } catch { /* permissions API がない端末 */ }
  return null;
}
