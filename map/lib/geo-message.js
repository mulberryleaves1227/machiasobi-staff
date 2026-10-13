// geo-message.js — 位置情報が取れないときの案内文

// 位置情報の取得に失敗した理由（GeolocationPositionError の code）を、スタッフが自分で直せる言葉にする
// 1: 許可されていない / 2: 位置がわからない / 3: 時間切れ
export function geoErrorMessage(code) {
  if (code === 1) return permissionHelp(navigator.userAgent);
  if (code === 3) return '現在地の取得に時間がかかっています。もう一度「📍 現在地を取得」を押してください。';
  return '現在地を取得できませんでした。端末の位置情報がオンか確認してください。';
}

// 位置情報が許可されていないときに、使っているアプリ・ブラウザごとの設定場所を案内する
// iPhone の Chrome / Google アプリは、Safari ではなくアプリごとの位置情報設定に従う
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

// ページを開いた時点で現在地が使えない状態なら、その案内文を返す（使えそうなら null）
// 一度「許可しない」を選んでいると、ボタンを押しても何も起きないので先に知らせる
export async function geoUnavailableMessage() {
  if (!window.isSecureContext || !navigator.geolocation) {
    return 'このページでは現在地を使えません（HTTPSで開いてください）。';
  }
  try {
    const st = await navigator.permissions?.query({ name: 'geolocation' });
    if (st?.state === 'denied') return geoErrorMessage(1);
  } catch { /* permissions API がない端末では事前確認しない */ }
  return null;
}
