<script>
    import { Button, Container } from "sveltestrap";
    const ipc = require("electron").ipcRenderer;
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();
    let filelist = [];
    ipc.send("request_files");
    ipc.on("music_files", function (event, arg) {
        console.log(event);
        filelist = arg;
        console.log("ipc got " + arg);
    });
</script>

<main>
    <ul>
        {#each filelist as item}
            <li>
                <Button on:click={() => dispatch("play", item.name)}>
                    {item.name}
                </Button>
            </li>
        {/each}
    </ul>
</main>

<style>
    /* your styles go here */
    ul {
        list-style: none;
    }
    li {
        margin-bottom: 0.5rem;
    }
</style>
