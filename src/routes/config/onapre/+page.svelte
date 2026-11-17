<script lang="ts">
	import { axiosA } from '#lib/adapters/Axios.adapter.ts';
	import Button from '#lib/components/ui/button/button.svelte';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { getApiErrorMessage } from '#lib/helpers/client/getApiErrorMessage.ts';
	import { Spinner } from '#lib/components/ui/spinner/index.ts';
	import { CheckIcon, PencilIcon, PlusIcon, TrashIcon, XIcon } from '@lucide/svelte/icons';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';

	type PersonnelType = 'A' | 'O';
	type OnapreRecord = {
		id: number;
		tipoPersonal: PersonnelType;
		rango: number;
		claseFuncionario: string;
		salarioBase: string;
	};
	type RecordForm = {
		rango: string;
		claseFuncionario: string;
		salarioBase: string | number;
	};

	const administrativeClasses = ['BI', 'BII', 'BIII', 'TI', 'TII', 'PI', 'PII', 'PIII'];
	const workerClassLabels: Record<string, string> = {
		NC: 'NO CLASIFICADO',
		C: 'CLASIFICADO',
		S: 'SUPERVISOR'
	};
	const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
	const personnelTypes = [
		{ value: 'A', label: 'Administrativo' },
		{ value: 'O', label: 'Obrero' }
	];
	const formatSalary = (salary: string) =>
		new Intl.NumberFormat('es-VE', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(Number(salary));

	let { data }: PageProps = $props();
	let records = $state<OnapreRecord[]>([]);
	let selectedType = $state<PersonnelType>('A');
	let editingId = $state<number | null>(null);
	let editForm = $state<RecordForm>({ rango: '', claseFuncionario: '', salarioBase: '' });
	let addForm = $state<RecordForm>({ rango: '', claseFuncionario: '', salarioBase: '' });
	let saving = $state(false);
	let deleting = $state(false);
	let selectedRecord = $state<OnapreRecord | null>(null);
	let deleteDialogOpen = $state(false);

	const typeRecords = $derived(
		records
			.filter((record) => record.tipoPersonal === selectedType)
			.sort(
				(first, second) =>
					first.rango - second.rango ||
					first.claseFuncionario.localeCompare(second.claseFuncionario)
			)
	);
	const rangeOptions = $derived(
		Array.from({ length: selectedType === 'A' ? 7 : 10 }, (_, index) => {
			const value = index + 1;
			return {
				value: String(value),
				label: selectedType === 'A' ? romanNumerals[index] : String(value)
			};
		})
	);
	const formRange = $derived(Number(addForm.rango));
	const editRange = $derived(Number(editForm.rango));
	const addClassOptions = $derived(getClassOptions(formRange));
	const editClassOptions = $derived(getClassOptions(editRange));
	const addClassLabel = $derived(getClassLabel(addForm.claseFuncionario));

	$effect(() => {
		records = data.records.map((record) => ({ ...record }));
	});

	function getClassOptions(range: number) {
		if (selectedType === 'A') {
			return administrativeClasses.map((value) => ({ value, label: value }));
		}
		const value = range >= 1 && range <= 4 ? 'NC' : range <= 8 && range >= 5 ? 'C' : range <= 10 && range >= 9 ? 'S' : '';
		return value ? [{ value, label: getClassLabel(value) }] : [];
	}

	function getClassLabel(code: string) {
		return workerClassLabels[code] ? `${code} — ${workerClassLabels[code]}` : code;
	}

	function rangeLabel(range: number) {
		return selectedType === 'A' ? romanNumerals[range - 1] ?? String(range) : String(range);
	}

	function resetAddForm() {
		addForm = { rango: '', claseFuncionario: '', salarioBase: '' };
	}

	function changeAddRange(range: string | undefined) {
		addForm.rango = range ?? '';
		addForm.claseFuncionario = selectedType === 'O' ? (getClassOptions(Number(range))[0]?.value ?? '') : '';
	}

	function changeEditRange(range: string | undefined) {
		editForm.rango = range ?? '';
		editForm.claseFuncionario =
			selectedType === 'O' ? (getClassOptions(Number(range))[0]?.value ?? '') : '';
	}

	function changeType(value: string | undefined) {
		if (value !== 'A' && value !== 'O') return;
		selectedType = value;
		editingId = null;
		editForm = { rango: '', claseFuncionario: '', salarioBase: '' };
		resetAddForm();
	}

	function startEditing(record: OnapreRecord) {
		editingId = record.id;
		editForm = {
			rango: String(record.rango),
			claseFuncionario: record.claseFuncionario,
			salarioBase: record.salarioBase
		};
	}

	function isValidSalary(value: string) {
		const salary = Number(value);
		return Number.isFinite(salary) && salary >= 0 && /^\d+(\.\d{1,2})?$/.test(value);
	}

	function isValidCombination(range: number, classCode: string) {
		return getClassOptions(range).some((option) => option.value === classCode);
	}

	async function saveRecord(record?: OnapreRecord) {
		const form = record ? editForm : addForm;
		const range = Number(form.rango);
		const salary = String(form.salarioBase ?? '').trim();
		if (!Number.isInteger(range) || !isValidCombination(range, form.claseFuncionario)) {
			toast.error('Selecciona un rango y cargo válidos.');
			return;
		}
		if (!isValidSalary(salary)) {
			toast.error('Indica un salario base válido con máximo dos decimales.');
			return;
		}
		if (
			typeRecords.some(
				(current) =>
					current.id !== record?.id &&
					current.rango === range &&
					current.claseFuncionario === form.claseFuncionario
			)
		) {
			toast.error('Ya existe una configuración para ese rango y cargo.');
			return;
		}

		saving = true;
		try {
			const payload = {
				tipoPersonal: selectedType,
				rango: range,
				claseFuncionario: form.claseFuncionario,
				salarioBase: Number(salary)
			};
			const response = record
				? await axiosA.put(`/onapre/${record.id}`, payload)
				: await axiosA.post('/onapre', payload);
			const savedRecord = response.data as OnapreRecord;
			records = record
				? records.map((current) => (current.id === record.id ? savedRecord : current))
				: [...records, savedRecord];
			toast.success(record ? 'Configuración ONAPRE actualizada.' : 'Configuración ONAPRE registrada.');
			if (record) editingId = null;
			else resetAddForm();
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			saving = false;
		}
	}

	async function deleteRecord() {
		if (!selectedRecord) return;
		deleting = true;
		try {
			await axiosA.delete(`/onapre/${selectedRecord.id}`);
			records = records.filter((record) => record.id !== selectedRecord?.id);
			toast.success('Configuración ONAPRE eliminada.');
			selectedRecord = null;
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			deleteDialogOpen = false;
			deleting = false;
		}
	}
</script>


<main class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col items-center gap-6 px-4 py-8">
	<div class="text-center">
		<h1 class="text-2xl font-bold">Tabla ONAPRE</h1>
	</div>

	<Card.Root class="w-full">
		<Card.Header class="gap-4 sm:flex-row sm:items-center sm:justify-between">
			<Card.Title>Valores configurados</Card.Title>
			<Select.Root
				value={selectedType}
				onValueChange={changeType}
				type="single"
				items={personnelTypes}
			>
				<Select.Trigger class="w-full sm:w-56" aria-label="Tipo de personal">
					<Select.Value placeholder="Tipo de personal" />
				</Select.Trigger>
				<Select.Content>
					{#each personnelTypes as type (type.value)}
						<Select.Item value={type.value} label={type.label} />
					{/each}
				</Select.Content>
			</Select.Root>
		</Card.Header>
		<Card.Content>
			<div class="overflow-x-auto">
				<form
					onsubmit={(event) => {
						event.preventDefault();
						const record =
							editingId === null
								? undefined
								: typeRecords.find((current) => current.id === editingId);
						if (editingId !== null && !record) {
							toast.error('No se encontró la configuración que intentas actualizar.');
							return;
						}
						void saveRecord(record);
					}}
				>
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Rango</Table.Head>
								<Table.Head>Cargo / Clase de funcionario</Table.Head>
								<Table.Head>Salario base</Table.Head>
								<Table.Head class="text-right">Acciones</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each typeRecords as record (record.id)}
								<Table.Row>
									{#if editingId === record.id}
										<Table.Cell>
											<Select.Root
												value={editForm.rango}
												onValueChange={changeEditRange}
												type="single"
												items={rangeOptions}
												disabled={saving}
											>
												<Select.Trigger class="min-w-24" aria-label="Rango">
													<Select.Value placeholder="Rango" />
												</Select.Trigger>
												<Select.Content>
													{#each rangeOptions as range (range.value)}
														<Select.Item value={range.value} label={range.label} />
													{/each}
												</Select.Content>
											</Select.Root>
										</Table.Cell>
										<Table.Cell>
											<Select.Root
												bind:value={editForm.claseFuncionario}
												type="single"
												items={editClassOptions}
												disabled={saving || selectedType === 'O'}
											>
												<Select.Trigger class="min-w-40" aria-label="Cargo o clase">
													<Select.Value placeholder="Selecciona cargo" />
												</Select.Trigger>
												<Select.Content>
													{#each editClassOptions as option (option.value)}
														<Select.Item value={option.value} label={option.label} />
													{/each}
												</Select.Content>
											</Select.Root>
										</Table.Cell>
										<Table.Cell>
											<Input
												type="number"
												min="0"
												step="0.01"
												bind:value={editForm.salarioBase}
												aria-label="Salario base"
												placeholder="Salario base"
												required
												disabled={saving}
											/>
										</Table.Cell>
										<Table.Cell class="text-right">
											<div class="flex justify-end gap-1">
												<Button
													type="button"
													variant="ghost"
													size="icon"
													aria-label="Cancelar edición"
													onclick={() => (editingId = null)}
													disabled={saving}
												>
													<XIcon class="size-4" />
												</Button>
												<Button type="submit" size="icon" aria-label="Guardar cambios" disabled={saving}>
													{#if saving}<Spinner class="size-4" />{:else}<CheckIcon class="size-4" />{/if}
												</Button>
											</div>
										</Table.Cell>
									{:else}
										<Table.Cell class="font-medium">{rangeLabel(record.rango)}</Table.Cell>
										<Table.Cell>
											{selectedType === 'O'
												? getClassLabel(record.claseFuncionario)
												: record.claseFuncionario}
										</Table.Cell>
										<Table.Cell>{formatSalary(record.salarioBase)}</Table.Cell>
										<Table.Cell class="text-right">
											<div class="flex justify-end gap-1">
												<Button
													variant="outline"
													size="icon"
													aria-label="Editar configuración"
													onclick={() => startEditing(record)}
													disabled={saving || editingId !== null}
												>
													<PencilIcon class="size-4" />
												</Button>
												<Button
													variant="destructive"
													size="icon"
													aria-label="Eliminar configuración"
													onclick={() => {
														selectedRecord = record;
														deleteDialogOpen = true;
													}}
													disabled={saving}
												>
													<TrashIcon class="size-4" />
												</Button>
											</div>
										</Table.Cell>
									{/if}
								</Table.Row>
							{/each}
							<Table.Row class="bg-muted/40">
								<Table.Cell>
									<Select.Root
										bind:value={addForm.rango}
										onValueChange={changeAddRange}
										type="single"
										items={rangeOptions}
										disabled={saving || editingId !== null}
									>
										<Select.Trigger class="min-w-24" aria-label="Nuevo rango">
											<Select.Value placeholder="Rango" />
										</Select.Trigger>
										<Select.Content>
											{#each rangeOptions as range (range.value)}
												<Select.Item value={range.value} label={range.label} />
											{/each}
										</Select.Content>
									</Select.Root>
								</Table.Cell>
								<Table.Cell>
									<Select.Root
										bind:value={addForm.claseFuncionario}
										type="single"
										items={addClassOptions}
										disabled={saving || editingId !== null || !addForm.rango || selectedType === 'O'}
									>
										<Select.Trigger class="min-w-40" aria-label="Nuevo cargo o clase">
											<Select.Value placeholder={addForm.rango ? 'Selecciona cargo' : 'Primero elige rango'} />
										</Select.Trigger>
										<Select.Content>
											{#each addClassOptions as option (option.value)}
												<Select.Item value={option.value} label={option.label} />
											{/each}
										</Select.Content>
									</Select.Root>
								</Table.Cell>
								<Table.Cell>
									<Input
										type="number"
										min="0"
										step="0.01"
										bind:value={addForm.salarioBase}
										aria-label="Nuevo salario base"
										placeholder="Salario base"
										disabled={saving || editingId !== null}
									/>
								</Table.Cell>
								<Table.Cell class="text-right">
									<Button
										type="submit"
										size="icon"
										aria-label="Agregar configuración"
										disabled={saving || editingId !== null}
									>
										{#if saving}<Spinner class="size-4" />{:else}<PlusIcon class="size-4" />{/if}
									</Button>
								</Table.Cell>
							</Table.Row>
						</Table.Body>
					</Table.Root>
				</form>
			</div>
			{#if typeRecords.length === 0}
				<p class="mt-4 text-center text-sm text-muted-foreground">
					No hay configuraciones ONAPRE registradas para {selectedType === 'A' ? 'Administrativos' : 'Obreros'}.
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</main>

<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Eliminar configuración ONAPRE</Dialog.Title>
			<Dialog.Description>
				¿Deseas eliminar rango {selectedRecord ? rangeLabel(selectedRecord.rango) : ''}
				{selectedRecord?.tipoPersonal === 'O' ? getClassLabel(selectedRecord.claseFuncionario) : selectedRecord?.claseFuncionario}?
				Si ya está asignada a personal, el backend impedirá eliminarla.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props} variant="outline" disabled={deleting}>Cancelar</Button>
				{/snippet}
			</Dialog.Close>
			<Button variant="destructive" onclick={deleteRecord} disabled={deleting}>
				{#if deleting}<Spinner class="size-4" />{/if}
				Eliminar
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
