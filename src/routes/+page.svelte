<script lang="ts">
	// ...

	import SortableList from '$lib/components/ui/SortableList.svelte';

	// ...

    let list = [
        {id: 1, data: 'Item 1'},
        {id: 2, data: 'Item 2'},
        {id: 3, data: 'Item 3'},
        {id: 4, data: 'Item 4'},
        {id: 5, data: 'Item 5'},
    ];

	function sortList(e: CustomEvent) {
        list = e.detail;
	}

</script>

<SortableList {list} on:sort={sortList} let:item let:index>
	<div class="group relative">
		{item.data}
	</div>
</SortableList>
