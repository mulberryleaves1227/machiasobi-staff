// place-choices.js — 近すぎて重なっているピンの候補一覧（ポップアップに出す）
// props:
//   places  候補の場所の配列（近い順）
// emits:
//   select(place)  候補がタップされた

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
