<template>
  <fieldset class="form-col">
    <legend>Accommodations</legend>
    
    <!-- Formatting Help -->
    <div class="formatting-help">
      <p><strong>💡 Tip:</strong> Text will display as separate list items in the student table when separated by:</p>
      <ul class="format-examples">
        <li><code>New line</code> (Enter key)</li>
        <li><code>- </code> (dash + space)</li>
        <li><code>;</code> (semicolon)</li>
        <li><code>1. 2. 3.</code> (numbers + period + space)</li>
      </ul>
      <p class="example">
        <strong>Example:</strong> "at-a-glance" = 1 item | "at - a - glance" = 3 items
      </p>
    </div>
    
    <div class="inner-grid-2">
      <label>
        Instruction:
        <textarea v-model="form.instruction" placeholder="Enter instructional accommodations..."></textarea>
      </label>
      <label>
        Assessment:
        <textarea v-model="form.assessment" placeholder="Enter assessment accommodations..."></textarea>
      </label>
    </div>
  </fieldset>
</template>

<script setup>
// Props
const props = defineProps({
  form: { type: Object, required: true }
})

// No local state needed - all data flows through props
</script>

<style scoped>
textarea {
  min-height: 80px;
  resize: vertical;
}

.formatting-help {
  background-color: #f0f8ff;
  border: 1px solid #cce7ff;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
  font-size: 14px;
}

.formatting-help p {
  margin: 0 0 8px 0;
}

.format-examples {
  margin: 8px 0;
  padding-left: 20px;
}

.format-examples li {
  margin: 4px 0;
}

.format-examples code {
  background-color: #e8f4fd;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
}

.example {
  font-style: italic;
  color: #666;
  border-top: 1px solid #ddd;
  padding-top: 8px;
  margin-top: 8px;
}
</style> 