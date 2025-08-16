<template>
  <div class="admin-tab-bar">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      :class="{ active: activeTab === tab.key }"
      @click="$emit('tab-change', tab.key)"
      :title="getStatusTooltip(tab.status)"
    >
      {{ tab.label }}
      <span v-if="tab.status" :class="['status-indicator', tab.status]">
        {{ getStatusIcon(tab.status) }}
      </span>
    </button>
  </div>
</template>

<script>
export default {
  name: 'TabBar',
  props: {
    tabs: {
      type: Array,
      required: true,
      default: () => []
    },
    activeTab: {
      type: String,
      required: true
    }
  },
  emits: ['tab-change'],
  methods: {
    getStatusIcon(status) {
      switch (status) {
        case 'not-active':
          return '⭐'
        case 'not-working':
          return '❌'
        default:
          return ''
      }
    },
    getStatusTooltip(status) {
      switch (status) {
        case 'not-active':
          return '⭐ = Not active'
        case 'not-working':
          return '❌ = Not working'
        default:
          return ''
      }
    }
  }
}
</script>

<style scoped>
/* Component styles included in main.css */

.status-indicator {
  margin-left: 6px;
  font-size: 12px;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.status-indicator.not-active {
  color: #f39c12;
}

.status-indicator.not-working {
  color: #e74c3c;
}

button:hover .status-indicator {
  opacity: 1;
}
</style>
