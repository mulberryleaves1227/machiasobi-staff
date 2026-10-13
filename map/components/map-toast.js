// map-toast.js — 地図の上に出すお知らせ（現在地の取得状況やエラーの案内）
// props:
//   message  表示する文（空なら何も出さない）
// emits:
//   close  お知らせがタップされた（閉じるのは親が行う）

export default {
  props: {
    message: { type: String, default: '' },
  },

  emits: ['close'],

  template: `
    <div v-if="message" class="toast" @click="$emit('close')">{{ message }}</div>
  `,
};
