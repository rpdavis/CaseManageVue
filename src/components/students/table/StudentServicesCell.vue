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
            <span v-if="getServiceProviderId(student, 'speechId')" class="service-provider-item">SP ({{ getUserInitialLastName(getServiceProviderId(student, 'speechId')) }})</span>
            <span v-if="getServiceProviderId(student, 'mhId')" class="service-provider-item">MH ({{ getUserInitialLastName(getServiceProviderId(student, 'mhId')) }})</span>
            <span v-if="getServiceProviderId(student, 'otId')" class="service-provider-item">OT ({{ getUserInitialLastName(getServiceProviderId(student, 'otId')) }})</span>
            <span v-if="getServiceProviderId(student, 'ptId')" class="service-provider-item">PT ({{ getUserInitialLastName(getServiceProviderId(student, 'ptId')) }})</span>
            <span v-if="getServiceProviderId(student, 'scId')" class="service-provider-item">SC ({{ getUserInitialLastName(getServiceProviderId(student, 'scId')) }})</span>
            <span v-if="getServiceProviderId(student, 'trId')" class="service-provider-item">TR ({{ getUserInitialLastName(getServiceProviderId(student, 'trId')) }})</span>
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