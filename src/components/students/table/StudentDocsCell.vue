<template>
  <td class="documents-column">
    <div class="docs-item">
      
      <a 
        v-if="getDocumentUrl(student, 'ataglancePdfUrl')" 
        href="#" 
        @click.prevent="openSecureFile(getDocumentUrl(student, 'ataglancePdfUrl'), 'ataglance')"
        class="doc-link"
        :class="{ 'loading': loadingFiles.ataglance }"
      >
        <div v-if="loadingFiles.ataglance" class="loading-spinner">
          <RotateCw :size="14" class="spin" />
        </div>
        <FileText v-else :size="16" class="doc-icon" />
        <span>{{ loadingFiles.ataglance ? 'Loading...' : 'At-A-Glance' }}</span>
      </a>
      
      <a 
        v-if="getDocumentUrl(student, 'bipPdfUrl')" 
        href="#" 
        @click.prevent="openSecureFile(getDocumentUrl(student, 'bipPdfUrl'), 'bip')"
        class="doc-link"
        :class="{ 'loading': loadingFiles.bip }"
      >
        <div v-if="loadingFiles.bip" class="loading-spinner">
          <RotateCw :size="14" class="spin" />
        </div>
        <FileText v-else :size="16" class="doc-icon" />
        <span>{{ loadingFiles.bip ? 'Loading...' : 'BIP' }}</span>
      </a>

      <!-- Additional Documents -->
      <a 
        v-for="doc in getAdditionalDocuments(student)" 
        :key="doc.id"
        href="#" 
        @click.prevent="openSecureAdditionalFile(doc)"
        class="doc-link"
        :class="{ 'loading': loadingFiles[doc.id] }"
      >
        <div v-if="loadingFiles[doc.id]" class="loading-spinner">
          <RotateCw :size="14" class="spin" />
        </div>
        <FileText v-else :size="16" class="doc-icon" />
        <span>{{ loadingFiles[doc.id] ? 'Loading...' : doc.title }}</span>
      </a>
      
      <template v-if="!getDocumentUrl(student, 'ataglancePdfUrl') && !getDocumentUrl(student, 'bipPdfUrl') && getAdditionalDocuments(student).length === 0">—</template>
    </div>
  </td>
</template>

<script setup>
import { ref } from 'vue'
import usePdfHandler from '@/composables/usePdfHandler'
import { FileText, RotateCw } from 'lucide-vue-next'

const props = defineProps({
  student: {
    type: Object,
    required: true
  },
  getDocumentUrl: {
    type: Function,
    required: true
  },
  getAdditionalDocuments: {
    type: Function,
    required: true
  }
})

// Use PDF handler for secure download and viewing
const { downloadPdf } = usePdfHandler()

// Loading states for each file type (including additional documents)
const loadingFiles = ref({
  ataglance: false,
  bip: false
})

// Handle secure file opening with loading states
const openSecureFile = async (filePath, fileType) => {
  try {
    if (!filePath) {
      alert('File not found.')
      return
    }
    
    // Set loading state
    loadingFiles.value[fileType] = true
    
    // Get the original filename from the student data
    const originalFileName = props.student.app?.documents?.bipFileName || 
                           props.student.app?.documents?.ataglanceFileName || 
                           'document.pdf'
    
    // Use the secure PDF handler to decrypt and open the file
    await downloadPdf(filePath, props.student.id, originalFileName)
    
  } catch (error) {
    console.error('Error opening secure file:', error)
    alert('Error opening file. Please try again.')
  } finally {
    // Clear loading state
    loadingFiles.value[fileType] = false
  }
}

// Handle opening additional documents
const openSecureAdditionalFile = async (doc) => {
  try {
    if (!doc.pdfUrl) {
      alert('File not found.')
      return
    }
    
    // Set loading state for this specific document
    loadingFiles.value[doc.id] = true
    
    // Use the secure PDF handler to decrypt and open the file
    await downloadPdf(doc.pdfUrl, props.student.id, doc.fileName)
    
  } catch (error) {
    console.error('Error opening additional document:', error)
    alert('Error opening file. Please try again.')
  } finally {
    // Clear loading state
    loadingFiles.value[doc.id] = false
  }
}
</script>

<style scoped>
.docs-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.doc-link {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: #1976d2;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.25rem 0;
  transition: all 0.2s ease;
}

.doc-link:hover {
  color: #1565c0;
  text-decoration: underline;
}

.doc-link.loading {
  color: #666;
  cursor: wait;
  pointer-events: none;
}

.doc-link.loading:hover {
  text-decoration: none;
}

.doc-icon {
  flex-shrink: 0;
  opacity: 0.8;
}

.doc-link:hover .doc-icon {
  opacity: 1;
}

.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.spin {
  animation: spin 1s linear infinite;
  color: #1976d2;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style> 