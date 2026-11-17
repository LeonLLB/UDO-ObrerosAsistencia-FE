<script lang="ts">
	import Button from '#lib/components/ui/button/button.svelte';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { ArrowLeft, CalendarDays } from '@lucide/svelte/icons';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const permissionState = (start: string, end: string) => {
		const from = start.slice(0, 10);
		const to = end.slice(0, 10);
		if (from <= data.today && to >= data.today) return 'Activo';
		return to < data.today ? 'Culminado' : 'Pendiente';
	};
</script>

<svelte:head>
	<title>Historial de permisos</title>
</svelte:head>

<main class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col gap-6 px-4 py-8">
	<div>
		<Button variant="outline" href="/personal/permissions">
			<ArrowLeft class="size-4" />
			Volver a permisos
		</Button>
	</div>

	<div>
		<h1 class="text-2xl font-bold">Historial de permisos</h1>
		<p class="mt-1 text-muted-foreground">
			{data.employee.nombres} {data.employee.apellidos} — Cédula {data.employee.cedula}
		</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<CalendarDays class="size-5" />
				Permisos registrados
			</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if data.permissions.length === 0}
				<p class="py-8 text-center text-muted-foreground">
					Este funcionario no tiene permisos registrados.
				</p>
			{:else}
				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Descripción</Table.Head>
								<Table.Head>Patología</Table.Head>
								<Table.Head>Desde</Table.Head>
								<Table.Head>Hasta</Table.Head>
								<Table.Head>Estado</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.permissions as permission (permission.id)}
								<Table.Row>
									<Table.Cell class="font-medium">{permission.descripcion}</Table.Cell>
									<Table.Cell>{permission.patologia}</Table.Cell>
									<Table.Cell>{permission.fechaInicio.slice(0, 10)}</Table.Cell>
									<Table.Cell>{permission.fechaFin.slice(0, 10)}</Table.Cell>
									<Table.Cell>{permissionState(permission.fechaInicio, permission.fechaFin)}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</main>
