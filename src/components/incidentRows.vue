<script setup>
    defineProps(['data']);

</script>

<template>
    <tr>
        <td>{{ data.case_number }}</td>
        <td>{{ data.date }}</td>
        <td>{{ data.time }}</td>
        <td>{{ data.incident }}</td>
    </tr>
</template>

<style scoped>
    th, td {
        border: solid 1px #000000;
    }
</style>