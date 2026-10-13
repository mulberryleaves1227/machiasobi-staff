// locate-button.js — 地図右下の「📍 現在地を取得」ボタン
// props:
//   locating  現在地を表示中か（表示中は青いボタンで「表示中」にする）
// emits:
//   toggle  ボタンが押された（表示の開始／終了の切り替えは親が行う）

export default {
  props: {
    locating: { type: Boolean, default: false },
  },

  emits: ['toggle'],

  template: `
    <button class="locate-btn" :class="{ active: locating }" type="button" @click="$emit('toggle')">
      {{ locating ? '📍 現在地を表示中' : '📍 現在地を取得' }}
    </button>
  `,
};
