<template>
<div class="management-tab">
    <button>Device...</button>
    <button>Choose File(s)...</button>
    <div v-on:drop.prevent="dropFile($event)" v-on:dragover.prevent class="dropZone">
        <p>Drop File(s)...</p>
    </div>
</div>
</template>

<script>

export default {
    components: {
        
    },
    data() {
        return {
        };
    },
    methods: {
        dropFile: function(event) {
            if (!event) return;
            var i, item, file;
            if (event.dataTransfer.items) {
                // Use DataTransferItemList interface to access the file(s)
                for (i = 0; i < event.dataTransfer.items.length; i++) {
                    // If dropped items aren't files, reject them
                    item = event.dataTransfer.items[i];
                    if (item.kind === 'file') {
                        file = item.getAsFile();
                        console.log('... file[' + i + '].name = ' + file.name);
                    }
                }
            } else {
                // Use DataTransfer interface to access the file(s)
                for (i = 0; i < event.dataTransfer.files.lenth; i++) {
                    file = event.dataTransfer.files[i];
                    console.log('... file[' + i + '].name = ' + file.name);
                }
            }
        }
    },
    computed: {
    },
    watch: {
    }
}
</script>

<style scoped>
    button {
        margin-right: 0.25em;
    }

    .dropZone {
        display: inline-block;
        border: thin solid rgb(126, 126, 126);
        width:  10em;
        height: 1.2em;
        background-color: rgb(159, 235, 245);
    }

    .dropZone p {
        margin: 0 auto;
        text-align: center;
    }
</style>