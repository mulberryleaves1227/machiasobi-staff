// 重なったピンの候補一覧を出すコンポーネント
export default {
  props: {
    places: { type: Array, required: true },
  },

  emits: ['select'],

  template: `
    <div class="pop-folder">この付近に{{ places.length }}件</div>
    <ul class="pop-choices">
      <li v-for="place in places" :key="place.fid">
        <button type="button" @click="$emit('select', place)">
          <span class="dot" :style="{ background: place.color }"></span>
          {{ place.name || '（名称なし）' }}
        </button>
      </li>
    </ul>
  `,
};
