<script lang="ts">
	import { axiosA } from '#lib/adapters/Axios.adapter.ts';
	import Button from '#lib/components/ui/button/button.svelte';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Spinner } from '#lib/components/ui/spinner/index.ts';
	import { getApiErrorMessage } from '#lib/helpers/client/getApiErrorMessage.ts';
	import { Pencil, Trash2 } from '@lucide/svelte/icons';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';

	type ConceptType = 'D' | 'F' | 'V';
	type PayrollConcept = {
		id: number;
		codigo: string;
		descripcion: string;
		tipoConcepto: ConceptType;
		formula: string | null;
		esAsignacion: number;
		autoAsignar: number;
	};

	const requiredConceptCodes = [
		'SUELDO_BASE',
		'BONO_HIJO',
		'BONO_HIJO_ESTUDIANDO',
		'BONO_PROFESIONALIZACION',
		'BONO_ANTIGUEDAD',
		'CESTATICKET',
		'DESCUENTO_INASISTENCIA'
	];
	const conceptTypeLabel: Record<ConceptType, string> = {
		D: 'Dinámico',
		F: 'Fijo del sistema',
		V: 'Variable'
	};

	let { data }: PageProps = $props();
	let concepts = $state<PayrollConcept[]>([]);
	let selectedConcept = $state<PayrollConcept | null>(null);
	let conceptToDelete = $state<PayrollConcept | null>(null);
	let editDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let saving = $state(false);
	let deleting = $state(false);
	let form = $state({
		formula: '',
		autoAsignar: 'false',
		esAsignacion: 'true'
	});

	$effect(() => {
		concepts = data.concepts.map((concept) => ({ ...concept }));
	});

	function canDelete(concept: PayrollConcept) {
		return !requiredConceptCodes.includes(concept.codigo);
	}

	function canConfigure(concept: PayrollConcept) {
		return concept.tipoConcepto !== 'V';
	}

	function formulaDescription(concept: PayrollConcept) {
		if (concept.tipoConcepto === 'F') return 'Cálculo interno del sistema';
		if (concept.tipoConcepto === 'V') return 'Monto capturado en el proceso de nómina';
		return concept.formula ?? 'Sin fórmula';
	}

	function openEdit(concept: PayrollConcept) {
		selectedConcept = concept;
		form = {
			formula: concept.formula ?? '',
			autoAsignar: String(concept.autoAsignar === 1),
			esAsignacion: String(concept.esAsignacion === 1)
		};
		editDialogOpen = true;
	}

	async function saveConfiguration() {
		if (!selectedConcept) return;
		if (selectedConcept.tipoConcepto === 'D' && !form.formula.trim()) {
			toast.error('La fórmula no puede estar vacía.');
			return;
		}
		saving = true;
		try {
			const payload = {
				...(selectedConcept.tipoConcepto === 'D' ? { formula: form.formula.trim() } : {}),
				autoAsignar: form.autoAsignar === 'true',
				esAsignacion: form.esAsignacion === 'true'
			};
			const response = await axiosA.put(
				`/nomina/conceptos/${selectedConcept.id}/configuracion`,
				payload
			);
			const updated = response.data as PayrollConcept;
			concepts = concepts.map((concept) => concept.id === updated.id ? updated : concept);
			editDialogOpen = false;
			toast.success('Configuración del concepto actualizada.');
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			saving = false;
		}
	}

	async function deleteConcept() {
		if (!conceptToDelete) return;
		deleting = true;
		try {
			await axiosA.delete(`/nomina/conceptos/${conceptToDelete.id}`);
			concepts = concepts.filter((concept) => concept.id !== conceptToDelete?.id);
			toast.success('Concepto eliminado del catálogo.');
			conceptToDelete = null;
			deleteDialogOpen = false;
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>Configurar conceptos de nómina</title>
</svelte:head>

<main class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-6 px-4 py-8">
	<div>
		<h1 class="text-2xl font-bold">Configurar conceptos de nómina</h1>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Catálogo de conceptos</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Código</Table.Head>
							<Table.Head>Descripción</Table.Head>
							<Table.Head>Tipo</Table.Head>
							<Table.Head>Fórmula / cálculo</Table.Head>
							<Table.Head>Autoasignar</Table.Head>
							<Table.Head>Operación</Table.Head>
							<Table.Head class="text-right">Acciones</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each concepts as concept (concept.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{concept.codigo}</Table.Cell>
								<Table.Cell>{concept.descripcion}</Table.Cell>
								<Table.Cell>{conceptTypeLabel[concept.tipoConcepto]}</Table.Cell>
								<Table.Cell class="max-w-72 truncate" title={formulaDescription(concept)}>
									{formulaDescription(concept)}
								</Table.Cell>
								<Table.Cell>
									{concept.tipoConcepto === 'V'
										? 'No aplica'
										: concept.autoAsignar === 1 ? 'Sí' : 'No'}
								</Table.Cell>
								<Table.Cell>
									{concept.tipoConcepto === 'V'
										? 'Gestionado por proceso'
										: concept.esAsignacion === 1 ? 'Asignación' : 'Deducción'}
								</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex justify-end gap-2">
										<Button
											variant="outline"
											size="icon"
											aria-label={`Configurar ${concept.codigo}`}
											title={canConfigure(concept) ? 'Editar configuración' : 'Concepto gestionado por el proceso de nómina'}
											onclick={() => openEdit(concept)}
											disabled={!canConfigure(concept) || saving}
										>
											<Pencil class="size-4" />
										</Button>
										<Button
											variant="destructive"
											size="icon"
											aria-label={`Eliminar ${concept.codigo}`}
											title={canDelete(concept) ? 'Eliminar concepto' : 'Concepto fijo requerido por nómina'}
											onclick={() => {
												conceptToDelete = concept;
												deleteDialogOpen = true;
											}}
											disabled={!canDelete(concept) || deleting}
										>
											<Trash2 class="size-4" />
										</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</main>

<Dialog.Root bind:open={editDialogOpen}>
	<Dialog.Content class="sm:max-w-xl">
		<Dialog.Header>
			<Dialog.Title>Configurar {selectedConcept?.codigo}</Dialog.Title>
			<Dialog.Description>{selectedConcept?.descripcion}</Dialog.Description>
		</Dialog.Header>
		{#if selectedConcept}
			<form onsubmit={(event) => { event.preventDefault(); void saveConfiguration(); }}>
				<Field.Group>
					{#if selectedConcept.tipoConcepto === 'D'}
						<Field.Field>
							<Label for="concept-formula">Fórmula</Label>
							<Input
								id="concept-formula"
								bind:value={form.formula}
								maxlength={500}
								placeholder="SUELDO * 0.10"
								required
								disabled={saving}
							/>
							<Field.Description>
								Usa SUELDO, números decimales con punto, +, -, *, / y paréntesis. Ejemplo: SUELDO * 0.10. No se admiten funciones ni variables adicionales.
							</Field.Description>
						</Field.Field>
					{:else}
						<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">
							{selectedConcept.tipoConcepto === 'F'
								? 'Este concepto se calcula con reglas específicas del sistema. Su fórmula no es editable aquí.'
								: 'Este concepto recibe su monto durante el proceso de nómina y no utiliza fórmula.'}
						</p>
					{/if}

					{#if selectedConcept.tipoConcepto !== 'V'}
						<Field.Field>
							<Label for="concept-auto-assign">Autoasignar al precargar</Label>
							<Select.Root bind:value={form.autoAsignar} type="single" items={[
								{ value: 'true', label: 'Sí' },
								{ value: 'false', label: 'No' }
							]}>
								<Select.Trigger id="concept-auto-assign" class="w-full"><Select.Value placeholder="Autoasignar" /></Select.Trigger>
								<Select.Content>
									<Select.Item value="true" label="Sí" />
									<Select.Item value="false" label="No" />
								</Select.Content>
							</Select.Root>
							<Field.Description>
								Si se desactiva, el concepto no se agregará automáticamente en las próximas precargas.
							</Field.Description>
						</Field.Field>
						<Field.Field>
							<Label for="concept-assignment">Aplicar como</Label>
							<Select.Root bind:value={form.esAsignacion} type="single" items={[
								{ value: 'true', label: 'Asignación' },
								{ value: 'false', label: 'Deducción' }
							]}>
								<Select.Trigger id="concept-assignment" class="w-full"><Select.Value placeholder="Tipo de operación" /></Select.Trigger>
								<Select.Content>
									<Select.Item value="true" label="Asignación" />
									<Select.Item value="false" label="Deducción" />
								</Select.Content>
							</Select.Root>
						</Field.Field>
					{/if}
				</Field.Group>
				<Dialog.Footer class="mt-4">
					<Button type="button" variant="outline" onclick={() => (editDialogOpen = false)} disabled={saving}>Cancelar</Button>
					<Button type="submit" disabled={saving}>
						{#if saving}<Spinner class="size-4" />{/if}Guardar cambios
					</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Eliminar concepto</Dialog.Title>
			<Dialog.Description>
				¿Deseas eliminar {conceptToDelete?.codigo} del catálogo? No se podrá eliminar si ya tiene registros históricos.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (deleteDialogOpen = false)} disabled={deleting}>Cancelar</Button>
			<Button variant="destructive" onclick={deleteConcept} disabled={deleting}>
				{#if deleting}<Spinner class="size-4" />{/if}Eliminar
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
