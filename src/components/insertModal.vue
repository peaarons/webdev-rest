<script>
export default {
  props: {
    show: Boolean
  },
  data() {
    return {
      formData: {
        case_number: null,
        date: '',
        time: '',
        code: '',
        incident: '',
        police_grid: '',
        neighborhood_number: null,
        block: ''
      }
    };
  },
  methods: {
    closeModal() {
      this.$emit('close');
    },
    submitForm() {
    let date_time = this.formData.date && this.formData.time ? 
        `${this.formData.date} ${this.formData.time}` : undefined;

    const data = {
      case_number: this.formData.case_number,
      date_time: date_time,
      date: this.formData.date,
      time: this.formData.time,
      code: this.formData.code,
      incident: this.formData.incident,
      police_grid: this.formData.police_grid,
      neighborhood_number: this.formData.neighborhood_number,
      block: this.formData.block
    };

    fetch('http://localhost:8100/new-incident', {
      method: 'PUT',
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
    .then(data => {
      console.log('Success:', data);
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
    <div v-if="show" class="modal-mask">
      <div class="modal-container">
        <form @submit.prevent="submitForm">
          <label for="case_number">Case Number:</label>
          <input type="number" id = "case_number" v-model="formData.case_number" required>

          <label for="date">Date:</label>
          <input type="date" id = "date" v-model="formData.date">

          <label for="time">Time:</label>
          <input type="time" id = "time" v-model="formData.time">

          <label for="code">Code:</label>
          <input type="text" id = "code" v-model="formData.code" required>

          <label for="incident">Incident:</label>
          <input type="text" id = "incident" v-model="formData.incident" required>

          <label for="police_grid">Police Grid:</label>
          <input type="text" id = "police_grid" v-model="formData.police_grid">

          <label for="neighborhood_number">Neighborhood Number:</label>
          <input type="number" id = "neighborhood_number" v-model="formData.neighborhood_number">

          <label for="block">Block:</label>
          <input type="text" id = "block" v-model="formData.block">

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