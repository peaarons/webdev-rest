<script>
export default {
  props: {
    show2: Boolean
  },
  data() {
    return {
      formData: {
        case_number: null,
      }
    };
  },
  methods: {
    closeModal() {
      this.$emit('close');
    },
    submitForm() {

    const data = {
      case_number: this.formData.case_number,
    };

    fetch('http://localhost:8100/remove-incident', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })
    .then(response => {
      if (response.ok) {
        return response.text();
      } else {
        throw new Error('Network response was not ok.');
      }
    })
    .then(() => {
      console.log('Success: Case number deleted', this.formData.case_number);
      this.$emit('delete-success', this.formData.case_number);
      this.closeModal();
    })
    .catch((error) => {
      console.error('Error:', error);
    });
  }
  }
};


</script>

<template>
  <Transition name="modal">
    <div v-if="show2" class="modal-mask">
      <div class="modal-container">
        <form @submit.prevent="submitForm">
          <label for="case_number">Case Number:</label>
          <input type="number" id = "case_number" v-model="formData.case_number" required>

          <button type="submit">Submit</button>
      </form>
        <button
          class="modal-default-button"
          @click="$emit('close')"
        >Cancel</button>
      </div>
    </div>
  </Transition>
</template>

<style>
.modal-mask {
  position: fixed;
  z-index: 9998;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  transition: opacity 0.3s ease;
}

.modal-container {
  width: 400px;
  margin: auto;
  padding: 20px 30px;
  background-color: #fff;
  border-radius: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
  transition: all 0.3s ease;
}

.modal-header h3 {
  margin-top: 0;
  color: #42b983;
}

.modal-body {
  margin: 20px 0;
}

.modal-default-button {
  float: right;
}

.modal-enter-from {
  opacity: 0;
}

.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  -webkit-transform: scale(1.1);
  transform: scale(1.1);
}
</style>