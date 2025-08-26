<template>
  <td class="service-column">
    <template v-if="getClassServices(student).length > 0 || getOtherServices(student).length > 0 || hasServiceProviders(student)">
      <div v-if="getClassServices(student).length > 0" class="services-section">
        <strong>Class Services:</strong>
        <div class="services-container">
          <span v-for="service in getClassServices(student)" :key="service" class="service-item">
            {{ service.startsWith('Other: ') ? service.replace('Other: ', '') : service }}
          </span>
        </div>
      </div>
      <div v-if="getOtherServices(student).length > 0 || hasServiceProviders(student)" class="services-section">
        <strong>Related Services:</strong>
        <div class="services-container">
          <span v-for="service in getOtherServices(student)" :key="service" class="service-item">
            {{ service }}
          </span>
          <template v-if="appSettings && appSettings.value && appSettings.value.serviceProviders">
            <template v-for="abbr in appSettings.value.serviceProviders" :key="abbr">
              <span v-if="getServiceProviderId(student, getProviderFieldName(abbr))" class="service-provider-item">
                {{ abbr }} ({{ getUserInitialLastName(getServiceProviderId(student, getProviderFieldName(abbr))) }})
              </span>
            </template>
          </template>
          <template v-else>
            <!-- Fallback: appSettings not available, using hardcoded providers -->
            <span v-if="getServiceProviderId(student, 'speechId')" class="service-provider-item">SP ({{ getUserInitialLastName(getServiceProviderId(student, 'speechId')) }})</span>
            <span v-if="getServiceProviderId(student, 'mhId')" class="service-provider-item">MH ({{ getUserInitialLastName(getServiceProviderId(student, 'mhId')) }})</span>
            <span v-if="getServiceProviderId(student, 'otId')" class="service-provider-item">OT ({{ getUserInitialLastName(getServiceProviderId(student, 'otId')) }})</span>
            <span v-if="getServiceProviderId(student, 'ptId')" class="service-provider-item">PT ({{ getUserInitialLastName(getServiceProviderId(student, 'ptId')) }})</span>
            <span v-if="getServiceProviderId(student, 'scId')" class="service-provider-item">SC ({{ getUserInitialLastName(getServiceProviderId(student, 'scId')) }})</span>
            <span v-if="getServiceProviderId(student, 'trId')" class="service-provider-item">TR ({{ getUserInitialLastName(getServiceProviderId(student, 'trId')) }})</span>
            <span v-if="getServiceProviderId(student, 'dhhId')" class="service-provider-item">DHH ({{ getUserInitialLastName(getServiceProviderId(student, 'dhhId')) }})</span>
            <span v-if="getServiceProviderId(student, 'audId')" class="service-provider-item">AUD ({{ getUserInitialLastName(getServiceProviderId(student, 'audId')) }})</span>
            <span v-if="getServiceProviderId(student, 'viId')" class="service-provider-item">VI ({{ getUserInitialLastName(getServiceProviderId(student, 'viId')) }})</span>
            <span v-if="getServiceProviderId(student, 'atId')" class="service-provider-item">AT ({{ getUserInitialLastName(getServiceProviderId(student, 'atId')) }})</span>
            <span v-if="getServiceProviderId(student, 'omId')" class="service-provider-item">O&M ({{ getUserInitialLastName(getServiceProviderId(student, 'omId')) }})</span>
            <span v-if="getServiceProviderId(student, 'bisId')" class="service-provider-item">BIS ({{ getUserInitialLastName(getServiceProviderId(student, 'bisId')) }})</span>
            <span v-if="getServiceProviderId(student, 'hnId')" class="service-provider-item">HN ({{ getUserInitialLastName(getServiceProviderId(student, 'hnId')) }})</span>
            <span v-if="getServiceProviderId(student, 'swId')" class="service-provider-item">SW ({{ getUserInitialLastName(getServiceProviderId(student, 'swId')) }})</span>
          </template>
        </div>
      </div>
    </template>
    <template v-else>
      —
    </template>
  </td>
</template>

<script setup>
const props = defineProps({
  student: { type: Object, required: true },
  appSettings: { type: Object, required: false },
  getClassServices: { type: Function, required: true },
  getOtherServices: { type: Function, required: true },
  hasServiceProviders: { type: Function, required: true },
  getServiceProviderId: { type: Function, required: true },
  getProviderFieldName: { type: Function, required: true },
  getUserInitialLastName: { type: Function, required: true }
})
</script> 