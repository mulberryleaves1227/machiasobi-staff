// 現在地ボタンのコンポーネント
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
