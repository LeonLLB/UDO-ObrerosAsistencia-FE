<script lang="ts">
	import { axiosA } from '#lib/adapters/Axios.adapter.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { Spinner } from '#lib/components/ui/spinner/index.ts';
	import { getApiErrorMessage } from '#lib/helpers/client/getApiErrorMessage.ts';
	import { DatabaseArrowDown, DatabaseArrowUp } from '@lucide/svelte/icons';
	import { toast } from 'svelte-sonner';

	const MAX_BACKUP_SIZE = 2 * 1024 * 1024 * 1024;

	let loading = $state<'export' | 'restore' | null>(null);
	let selectedFiles = $state<FileList>();
	let confirmRestore = $state(false);

	const exportBackup = async () => {
		loading = 'export';
		try {
			const response = await axiosA.post('/mantenimiento/backup', null, true);
			const blob = response.data as Blob;
			const disposition = response.headers['content-disposition'] as string | undefined;
			const fileName = disposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? 'backup.sql';
			const fileUrl = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = fileUrl;
			link.download = fileName;
			document.body.append(link);
			link.click();
			link.remove();
			window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
			toast.success('Backup descargado correctamente');
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			loading = null;
		}
	};

	const restoreBackup = async () => {
		const file = selectedFiles?.[0];
		if (!file) {
			toast.error('Selecciona el archivo SQL que deseas restaurar');
			return;
		}
		if (!file.name.toLowerCase().endsWith('.sql')) {
			toast.error('El archivo de backup debe tener extensión .sql');
			return;
		}
		if (file.size > MAX_BACKUP_SIZE) {
			toast.error('El archivo no puede superar los 2 GB');
			return;
		}

		loading = 'restore';
		try {
			const formData = new FormData();
			formData.append('backup', file);
			const response = await axiosA.post('/mantenimiento/restaurar', formData);
			toast.success(response.data?.mensaje ?? 'Backup restaurado correctamente');
			selectedFiles = undefined;
			confirmRestore = false;
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			loading = null;
		}
	};
</script>


<main class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col items-center justify-center px-4 py-10">
	<div class="mb-8 text-center">
		<h1 class="text-2xl font-bold">Respaldo de base de datos</h1>
	</div>

	<Card.Root class="w-full max-w-4xl">
		<Card.Content class="grid gap-8 p-6 md:grid-cols-[1fr_auto_1fr] md:items-stretch md:gap-8 md:p-10">
			<section class="flex flex-col items-center justify-center gap-4 text-center">
				<DatabaseArrowDown class="size-12 text-primary" aria-hidden="true" />
				<div>
					<h2 class="text-lg font-semibold">Exportar</h2>
					<p class="mt-1 max-w-sm text-sm text-muted-foreground">
						Genera y descarga una copia completa de la base de datos en formato SQL.
					</p>
				</div>
				<Button class="min-w-40" onclick={exportBackup} disabled={loading !== null}>
					{#if loading === 'export'}
						<Spinner class="size-4" />
						Generando...
					{:else}
						<DatabaseArrowDown class="size-4" />
						Descargar backup
					{/if}
				</Button>
			</section>

			<div class="h-px bg-border md:h-auto md:w-px" aria-hidden="true"></div>

			<section class="flex flex-col items-center justify-center gap-4 text-center">
				<DatabaseArrowUp class="size-12 text-primary" aria-hidden="true" />
				<div>
					<h2 class="text-lg font-semibold">Importar</h2>
					<p class="mt-1 max-w-sm text-sm text-muted-foreground">
						Selecciona un archivo .sql para restaurar la base de datos. Tamaño máximo: 2 GB.
					</p>
				</div>
				<div class="w-full max-w-sm space-y-3 text-left">
					<Label for="backup-file">Archivo SQL</Label>
					<Input
						id="backup-file"
						type="file"
						accept=".sql,application/sql"
						bind:files={selectedFiles}
						disabled={loading !== null}
					/>
				</div>
				<Button
					variant="destructive"
					class="min-w-40"
					onclick={() => (confirmRestore = true)}
					disabled={loading !== null || !selectedFiles?.length}
				>
					{#if loading === 'restore'}
						<Spinner class="size-4" />
						Restaurando...
					{:else}
						<DatabaseArrowUp class="size-4" />
						Restaurar backup
					{/if}
				</Button>
			</section>
		</Card.Content>
	</Card.Root>
</main>

<Dialog.Root bind:open={confirmRestore}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Confirmar restauración</Dialog.Title>
			<Dialog.Description>
				La restauración reemplazará la base de datos actual. Esta acción no se puede deshacer.
				¿Deseas continuar con {selectedFiles?.[0]?.name}?
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props} variant="outline" disabled={loading !== null}>Cancelar</Button>
				{/snippet}
			</Dialog.Close>
			<Button variant="destructive" onclick={restoreBackup} disabled={loading !== null}>
				{#if loading === 'restore'}<Spinner class="size-4" />{/if}
				Confirmar restauración
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
