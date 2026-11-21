<script lang="ts">
	import { goto } from '$app/navigation';
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
	import { downloadReport } from '#lib/helpers/client/downloadReport.ts';
	import { ArrowLeft, FileSpreadsheetIcon, Plus, Trash2 } from '@lucide/svelte/icons';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';

	type DynamicConcept = {
		id: number;
		codigo: string;
		descripcion: string;
		formula: string;
		esAsignacion: boolean;
	};
	type PayrollConcept = {
		id: number;
		asignacion: string | number;
		deduccion: string | number;
		q1: number | boolean;
		q2: number | boolean;
		concepto: {
			id: number;
			codigo: string;
			descripcion: string;
			esAsignacion: number | boolean;
			formula?: string | null;
			autoAsignar?: number;
		};
	};

	const academicLabels: Record<number, string> = {
		1: 'TSU',
		2: 'Licenciatura / Ingeniería / Abogacía / Arquitectura',
		3: 'Especialización',
		4: 'Maestría',
		5: 'Doctorado'
	};
	const months = [
		'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
		'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
	];
	const isChecked = (value: number | boolean) => value === true || value === 1;
	const conceptIsAssignment = (concept: PayrollConcept['concepto']) =>
		concept.esAsignacion === true || concept.esAsignacion === 1;
	const formatMoney = (value: number | string) =>
		`Bs. ${new Intl.NumberFormat('es-VE', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(Number(value))}`;

	let { data }: PageProps = $props();
	let entries = $state<PayrollConcept[]>([]);
	let dynamicConcepts = $state<DynamicConcept[]>([]);
	let loading = $state(true);
	let saving = $state(false);
	let deleting = $state(false);
	let downloadingReport = $state(false);
	let updatingQuincenaId = $state<number | null>(null);
	let selectedConceptId = $state('');
	let useFirstQuincena = $state(true);
	let useSecondQuincena = $state(true);
	let newConceptDialogOpen = $state(false);
	let pendingDelete = $state<PayrollConcept | null>(null);
	let newConceptForm = $state({
		codigo: '',
		descripcion: '',
		formula: '',
		esAsignacion: 'true'
	});

	const currentDateParts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/Caracas',
		year: 'numeric',
		month: 'numeric'
	}).formatToParts(new Date());
	const currentYear = Number(currentDateParts.find((part) => part.type === 'year')?.value);
	const currentMonth = Number(currentDateParts.find((part) => part.type === 'month')?.value);
	const canModifyPeriod = $derived(
		data.period.year === currentYear && data.period.month === currentMonth
	);
	const assignmentEntries = $derived(
		entries
			.filter((entry) => conceptIsAssignment(entry.concepto))
			.sort((first, second) => {
				if (first.concepto.codigo === 'SUELDO_BASE') return -1;
				if (second.concepto.codigo === 'SUELDO_BASE') return 1;
				return first.concepto.codigo.localeCompare(second.concepto.codigo);
			})
	);
	const deductionEntries = $derived(
		entries.filter((entry) => !conceptIsAssignment(entry.concepto))
	);
	const totalAssignments = $derived(
		assignmentEntries.reduce((total, entry) => total + Number(entry.asignacion), 0)
	);
	const totalDeductions = $derived(
		deductionEntries.reduce((total, entry) => total + Number(entry.deduccion), 0)
	);
	const netPay = $derived(totalAssignments - totalDeductions);
	const availableConcepts = $derived(
		dynamicConcepts.filter(
			(concept) => !entries.some((entry) => entry.concepto.id === concept.id)
		)
	);
	const conceptOptions = $derived(
		availableConcepts.map((concept) => ({
			value: String(concept.id),
			label: `${concept.codigo} — ${concept.descripcion}`
		}))
	);
	const selectedConcept = $derived(
		dynamicConcepts.find((concept) => concept.id === Number(selectedConceptId))
	);

	$effect(() => {
		dynamicConcepts = data.dynamicConcepts;
		void loadEntries();
	});

	async function loadEntries() {
		loading = true;
		try {
			const params = new URLSearchParams({
				mes: String(data.period.month),
				anio: String(data.period.year),
				cedula: data.employee.cedula
			});
			const response = await axiosA.get(`/nomina?${params.toString()}`);
			if (!Array.isArray(response.data)) {
				throw new Error('La respuesta del detalle de nómina tiene un formato inesperado.');
			}
			entries = (response.data as PayrollConcept[]).sort((first, second) =>
				first.concepto.codigo.localeCompare(second.concepto.codigo)
			);
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			loading = false;
		}
	}

	async function updateQuincena(entry: PayrollConcept, quincena: 'q1' | 'q2', checked: boolean) {
		const q1 = quincena === 'q1' ? checked : isChecked(entry.q1);
		const q2 = quincena === 'q2' ? checked : isChecked(entry.q2);
		if (!q1 && !q2) {
			toast.error('El concepto debe aplicarse al menos a una quincena.');
			return;
		}
		updatingQuincenaId = entry.id;
		try {
			await axiosA.put(`/nomina/${entry.id}`, {
				monto: Number(conceptIsAssignment(entry.concepto) ? entry.asignacion : entry.deduccion),
				q1,
				q2
			});
			entries = entries.map((current) =>
				current.id === entry.id ? { ...current, q1: Number(q1), q2: Number(q2) } : current
			);
			toast.success('Quincenas del concepto actualizadas.');
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			updatingQuincenaId = null;
		}
	}

	async function addConcept(concept: DynamicConcept) {
		if (!useFirstQuincena && !useSecondQuincena) {
			toast.error('Selecciona al menos una quincena.');
			return;
		}
		saving = true;
		try {
			await axiosA.post('/nomina/conceptos/dinamicos', {
				mes: data.period.month,
				anio: data.period.year,
				cedulas: [data.employee.cedula],
				codigo: concept.codigo,
				descripcion: concept.descripcion,
				formula: concept.formula,
				esAsignacion: concept.esAsignacion,
				q1: useFirstQuincena,
				q2: useSecondQuincena
			});
			await loadEntries();
			selectedConceptId = '';
			toast.success('Concepto agregado a la nómina.');
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			saving = false;
		}
	}

	async function createAndAddConcept() {
		const concept: DynamicConcept = {
			id: 0,
			codigo: newConceptForm.codigo.trim().toUpperCase(),
			descripcion: newConceptForm.descripcion.trim(),
			formula: newConceptForm.formula.trim(),
			esAsignacion: newConceptForm.esAsignacion === 'true'
		};
		if (!/^[A-Z0-9_]{1,40}$/.test(concept.codigo)) {
			toast.error('El código admite letras mayúsculas, números y guion bajo (máximo 40).');
			return;
		}
		if (!concept.descripcion || !concept.formula) {
			toast.error('Completa el código, la descripción y la fórmula.');
			return;
		}
		saving = true;
		try {
			const response = await axiosA.post('/nomina/conceptos/dinamicos', {
				mes: data.period.month,
				anio: data.period.year,
				cedulas: [data.employee.cedula],
				codigo: concept.codigo,
				descripcion: concept.descripcion,
				formula: concept.formula,
				esAsignacion: concept.esAsignacion,
				q1: useFirstQuincena,
				q2: useSecondQuincena
			});
			const createdId = Number(response.data?.concepto?.id);
			if (createdId > 0) {
				dynamicConcepts = [
					...dynamicConcepts,
					{ ...concept, id: createdId }
				].sort((first, second) => first.codigo.localeCompare(second.codigo));
			}
			await loadEntries();
			newConceptDialogOpen = false;
			newConceptForm = { codigo: '', descripcion: '', formula: '', esAsignacion: 'true' };
			toast.success('Concepto dinámico creado y aplicado.');
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			saving = false;
		}
	}

	async function deleteConcept(entry: PayrollConcept) {
		deleting = true;
		try {
			await axiosA.delete(`/nomina/${entry.id}`);
			entries = entries.filter((current) => current.id !== entry.id);
			pendingDelete = null;
			toast.success('Concepto eliminado de esta nómina.');
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			deleting = false;
		}
	}

	function backToPayroll() {
		void goto('/personal/nomina');
	}

	async function downloadPersonalReport() {
		downloadingReport = true;
		try {
			const params = new URLSearchParams({
				mes: String(data.period.month),
				anio: String(data.period.year)
			});
			await downloadReport(
				`/nomina/reportes/personal/${data.employee.id}?${params}`,
				`nomina-${data.employee.id}-${data.period.year}-${data.period.month}.pdf`
			);
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			downloadingReport = false;
		}
	}
</script>

<svelte:head>
	<title>Nómina de {data.employee.nombres} {data.employee.apellidos}</title>
</svelte:head>

<main class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-screen-2xl flex-col gap-6 px-4 py-8">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
		<Button variant="ghost" class="-ml-3 mb-2" onclick={backToPayroll}>
			<ArrowLeft class="size-4" /> Volver a nómina
		</Button>
		<h1 class="text-2xl font-bold">Detalle de nómina</h1>
		<p class="text-muted-foreground">{months[data.period.month - 1]} {data.period.year}</p>
		</div>
		<Button variant="outline" onclick={downloadPersonalReport} disabled={downloadingReport}>
			{#if downloadingReport}<Spinner class="size-4" />{:else}<FileSpreadsheetIcon class="size-4" />{/if}
			Descargar nómina PDF
		</Button>
	</div>

	{#if !canModifyPeriod}
		<p class="text-sm text-muted-foreground">
			Este período se puede consultar, pero solo el período actual permite modificar conceptos.
		</p>
	{/if}

	<Card.Root>
		<Card.Header><Card.Title>Información del trabajador</Card.Title></Card.Header>
		<Card.Content>
			<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<div><p class="text-sm text-muted-foreground">Cédula</p><p class="font-medium">{data.employee.cedula}</p></div>
				<div><p class="text-sm text-muted-foreground">Nombre</p><p class="font-medium">{data.employee.nombres} {data.employee.apellidos}</p></div>
				<div><p class="text-sm text-muted-foreground">Dependencia</p><p class="font-medium">{data.employee.dependencia}</p></div>
				<div><p class="text-sm text-muted-foreground">Tipo</p><p class="font-medium">{data.employee.tipo === 'A' ? 'Administrativo' : 'Obrero'}</p></div>
				<div><p class="text-sm text-muted-foreground">Hijos menores de edad</p><p class="font-medium">{data.employee.hijosMenores}</p></div>
				<div><p class="text-sm text-muted-foreground">Hijos menores que estudian</p><p class="font-medium">{data.employee.hijosMenoresEstudian}</p></div>
				<div>
					<p class="text-sm text-muted-foreground">Mayor nivel de profesionalización</p>
					<p class="font-medium">
						{data.employee.maximoAcademico === null
							? 'Sin información registrada'
							: academicLabels[data.employee.maximoAcademico] ?? 'Sin profesionalización'}
					</p>
				</div>
				<div>
					<p class="text-sm text-muted-foreground">ONAPRE</p>
					<p class="font-medium">
						{#if data.employee.onapre}
							{data.employee.tipo === 'A'
								? ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][data.employee.onapre.rango - 1] ?? data.employee.onapre.rango
								: data.employee.onapre.rango}
							· {data.employee.onapre.claseFuncionario}
							· {formatMoney(data.employee.onapre.salarioBase ?? '0')}
						{:else}
							Sin asignar
						{/if}
					</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Conceptos de nómina</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Código</Table.Head>
							<Table.Head>Descripción</Table.Head>
							<Table.Head class="text-center">1.ª quincena</Table.Head>
							<Table.Head class="text-center">2.ª quincena</Table.Head>
							<Table.Head class="text-right text-blue-600">Asignación</Table.Head>
							<Table.Head class="text-right text-red-600">Deducción</Table.Head>
							<Table.Head class="text-right">Acciones</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if loading}
							<Table.Row><Table.Cell colspan={7} class="py-10 text-center"><Spinner class="mx-auto size-5" /></Table.Cell></Table.Row>
						{:else if entries.length === 0}
							<Table.Row><Table.Cell colspan={7} class="py-10 text-center text-muted-foreground">No hay conceptos aplicados para este período.</Table.Cell></Table.Row>
						{:else}
							{#each assignmentEntries as entry (entry.id)}
								{@render ConceptRow(entry)}
							{/each}
							{#each deductionEntries as entry (entry.id)}
								{@render ConceptRow(entry)}
							{/each}
							<Table.Row class="font-semibold">
								<Table.Cell colspan={4} class="text-right">Totales</Table.Cell>
								<Table.Cell class="text-right text-blue-600">{formatMoney(totalAssignments)}</Table.Cell>
								<Table.Cell class="text-right text-red-600">{formatMoney(totalDeductions)}</Table.Cell>
								<Table.Cell></Table.Cell>
							</Table.Row>
							<Table.Row class="bg-muted/40 text-base font-bold">
								<Table.Cell colspan={5} class="text-right">Neto a pagar</Table.Cell>
								<Table.Cell class="text-right">{formatMoney(netPay)}</Table.Cell>
								<Table.Cell></Table.Cell>
							</Table.Row>
						{/if}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Añadir conceptos</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-5">
			<div class="grid gap-4 md:grid-cols-[1fr_auto]">
				<Field.Field>
					<Label for="existing-dynamic-concept">Concepto dinámico</Label>
					<Select.Root bind:value={selectedConceptId} type="single" items={conceptOptions}>
						<Select.Trigger id="existing-dynamic-concept" class="w-full" disabled={!canModifyPeriod || availableConcepts.length === 0}>
							<Select.Value placeholder={availableConcepts.length ? 'Selecciona un concepto' : 'No hay conceptos disponibles'} />
						</Select.Trigger>
						<Select.Content>{#each availableConcepts as concept (concept.id)}<Select.Item value={String(concept.id)} label={`${concept.codigo} — ${concept.descripcion}`} />{/each}</Select.Content>
					</Select.Root>
				</Field.Field>
				<div class="flex items-end">
					<Button onclick={() => selectedConcept && addConcept(selectedConcept)} disabled={!canModifyPeriod || !selectedConcept || saving}>
						{#if saving}<Spinner class="size-4" />{:else}<Plus class="size-4" />{/if}Añadir seleccionado
					</Button>
				</div>
			</div>
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div class="flex flex-wrap gap-5">
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" bind:checked={useFirstQuincena} disabled={!canModifyPeriod || saving} />
						Aplicar en primera quincena
					</label>
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" bind:checked={useSecondQuincena} disabled={!canModifyPeriod || saving} />
						Aplicar en segunda quincena
					</label>
				</div>
				<Button variant="outline" onclick={() => (newConceptDialogOpen = true)} disabled={!canModifyPeriod || saving}>
					<Plus class="size-4" /> Crear concepto dinámico
				</Button>
			</div>
		</Card.Content>
	</Card.Root>
</main>

{#snippet ConceptRow(entry: PayrollConcept)}
	{@const assigned = conceptIsAssignment(entry.concepto)}
	{@const protectedConcept = ['CESTATICKET', 'DESCUENTO_INASISTENCIA'].includes(entry.concepto.codigo)}
	{@const lockedQuincena = protectedConcept}
	<Table.Row>
		<Table.Cell class="font-medium">{entry.concepto.codigo}</Table.Cell>
		<Table.Cell>{entry.concepto.descripcion}</Table.Cell>
		<Table.Cell class="text-center">
			<input
				type="checkbox"
				checked={isChecked(entry.q1)}
				aria-label={`Aplicar ${entry.concepto.codigo} en primera quincena`}
				disabled={!canModifyPeriod || lockedQuincena || updatingQuincenaId === entry.id || (isChecked(entry.q1) && !isChecked(entry.q2))}
				onchange={(event) => void updateQuincena(entry, 'q1', event.currentTarget.checked)}
			/>
		</Table.Cell>
		<Table.Cell class="text-center">
			<input
				type="checkbox"
				checked={isChecked(entry.q2)}
				aria-label={`Aplicar ${entry.concepto.codigo} en segunda quincena`}
				disabled={!canModifyPeriod || lockedQuincena || updatingQuincenaId === entry.id || (isChecked(entry.q2) && !isChecked(entry.q1))}
				onchange={(event) => void updateQuincena(entry, 'q2', event.currentTarget.checked)}
			/>
		</Table.Cell>
		<Table.Cell class="text-right font-medium text-blue-600">{assigned ? formatMoney(entry.asignacion) : '—'}</Table.Cell>
		<Table.Cell class="text-right font-medium text-red-600">{assigned ? '—' : formatMoney(entry.deduccion)}</Table.Cell>
		<Table.Cell class="text-right">
			<Button
				variant="destructive"
				size="icon"
				aria-label={`Eliminar ${entry.concepto.codigo}`}
				title={protectedConcept ? 'Este concepto se administra de forma global.' : 'Eliminar concepto'}
				onclick={() => (pendingDelete = entry)}
				disabled={!canModifyPeriod || protectedConcept || deleting || updatingQuincenaId === entry.id}
			>
				{#if deleting && pendingDelete?.id === entry.id}<Spinner class="size-4" />{:else}<Trash2 class="size-4" />{/if}
			</Button>
		</Table.Cell>
	</Table.Row>
{/snippet}

<Dialog.Root bind:open={newConceptDialogOpen}>
	<Dialog.Content class="sm:max-w-xl">
		<Dialog.Header>
			<Dialog.Title>Crear concepto dinámico</Dialog.Title>
			<Dialog.Description>
				La fórmula usa SUELDO como sueldo ONAPRE, números, +, -, *, / y paréntesis. Ejemplo: SUELDO * 0.10.
			</Dialog.Description>
		</Dialog.Header>
		<form onsubmit={(event) => { event.preventDefault(); void createAndAddConcept(); }}>
			<Field.Group>
				<Field.Field>
					<Label for="concept-code">Código</Label>
					<Input id="concept-code" bind:value={newConceptForm.codigo} maxlength={40} placeholder="BONO_ESPECIAL" required disabled={saving} />
					<Field.Description>Solo letras mayúsculas, números y guion bajo.</Field.Description>
				</Field.Field>
				<Field.Field>
					<Label for="concept-description">Descripción</Label>
					<Input id="concept-description" bind:value={newConceptForm.descripcion} maxlength={150} required disabled={saving} />
				</Field.Field>
				<Field.Field>
					<Label for="concept-formula">Fórmula</Label>
					<Input id="concept-formula" bind:value={newConceptForm.formula} maxlength={500} placeholder="SUELDO * 0.10" required disabled={saving} />
					<Field.Description>
						Puedes usar SUELDO, decimales con punto, +, -, *, / y paréntesis. No se admiten funciones ni otros campos.
					</Field.Description>
				</Field.Field>
				<Field.Field>
					<Label for="concept-kind">Tipo de concepto</Label>
					<Select.Root bind:value={newConceptForm.esAsignacion} type="single" items={[
						{ value: 'true', label: 'Asignación' },
						{ value: 'false', label: 'Deducción' }
					]}>
						<Select.Trigger id="concept-kind" class="w-full"><Select.Value placeholder="Tipo" /></Select.Trigger>
						<Select.Content>
							<Select.Item value="true" label="Asignación" />
							<Select.Item value="false" label="Deducción" />
						</Select.Content>
					</Select.Root>
				</Field.Field>
			</Field.Group>
			<Dialog.Footer class="mt-4">
				<Button type="button" variant="outline" onclick={() => (newConceptDialogOpen = false)} disabled={saving}>Cancelar</Button>
				<Button type="submit" disabled={saving || (!useFirstQuincena && !useSecondQuincena)}>
					{#if saving}<Spinner class="size-4" />{/if}Crear y aplicar
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root open={pendingDelete !== null} onOpenChange={(open) => { if (!open && !deleting) pendingDelete = null; }}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Eliminar concepto de nómina</Dialog.Title>
			<Dialog.Description>
				¿Deseas eliminar {pendingDelete?.concepto.codigo} de la nómina de {data.employee.nombres} {data.employee.apellidos} para {months[data.period.month - 1]} {data.period.year}?
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (pendingDelete = null)} disabled={deleting}>Cancelar</Button>
			<Button variant="destructive" onclick={() => pendingDelete && deleteConcept(pendingDelete)} disabled={deleting || !pendingDelete}>
				{#if deleting}<Spinner class="size-4" />{/if}Eliminar
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
