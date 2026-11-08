<script lang="ts">
    import { axiosA } from '#lib/adapters/Axios.adapter.ts';
    import logo from '#lib/assets/logo_udo.png';
    import { Button } from '#lib/components/ui/button/index.ts';
    import * as Card from "#lib/components/ui/card/index.ts";
    import * as InputGroup from '#lib/components/ui/input-group/index.ts';
    import { Input } from '#lib/components/ui/input/index.ts';
    import { Label } from '#lib/components/ui/label/index.ts';
    import { Spinner } from '#lib/components/ui/spinner/index.ts';
    import { goto } from '$app/navigation';
    import EyeOffIcon from "@lucide/svelte/icons/eye-off";
    import EyeIcon from "@lucide/svelte/icons/eye";
    import { toast } from 'svelte-sonner';
    import { getApiErrorMessage } from '#lib/helpers/client/getApiErrorMessage.ts';

        let form = $state({
        ci:'',
        password:'',
        repeatPassword:''
    })

    let displayPassword = $state(false)

    let userStatus = $state<number | null>(null)

    let loadingText = $state('')
    
    const findUserStatus = async () => {

        if(form.ci.length !== 8 && form.ci.length !== 7) return toast.info('Error en Cédula de Identidad',{
            description:'Su Cédula de identidad debe tener entre 7 y 8 dígitos'
        })

        loadingText = 'Consultando Usuario...'

        try {
            const res = await axiosA.get(`/users/${form.ci}/status`)
            userStatus = res.data.status
        } catch (error) {
            toast.error(getApiErrorMessage(error))
        } finally {
            loadingText = ''
        }

    }
    const setPassword = async () => {

        if(![7,8].includes(form.ci.length)) return toast.info('Error en Cédula de Identidad',{
            description:'Su Cédula de identidad debe tener entre 7 y 8 dígitos'
        })

        if(form.password.length < 5) return toast.info('Error en Contraseña',{
            description:'Su nueva clave debe ser de mínimo 5 dígitos'
        })

        if(form.password !== form.repeatPassword) return toast.info('Error en Contraseñas',{
            description:'Las contraseñas no coinciden'
        })

        loadingText = 'Guardandos contraseña...'

        try {
            const res = await axiosA.post(`/users/set-password`,{
                cedula:form.ci,
                password:form.password,
                password2:form.repeatPassword
            })

            userStatus = 2
            toast.success(res.data.message)
            await loggIn()
        } catch (error) {
            toast.error(getApiErrorMessage(error))
        } finally {
            loadingText = ''
        }

    }

    const loggIn = async () => {

        if(form.ci.length !== 8 && form.ci.length !== 7) return toast.info('Error en Cédula de Identidad',{
            description:'Su Cédula de identidad debe tener entre 7 y 8 dígitos'
        })

        if(form.password.length < 5) return toast.info('Error en Contraseña',{
            description:'Su clave debe ser de mínimo 5 dígitos'
        })

        loadingText = 'Iniciando Sesión...'

        try {
            const res = await axiosA.post(`/auth/login`,{
                clave:form.password,
                cedula:form.ci
            })

            toast.success(res.data.message)
            return goto("/")
        } catch (error) {
            toast.error(getApiErrorMessage(error))
        } finally {
            loadingText = ''
        }

    }

    const callSubmitFunc = async () => {

        if(userStatus === null) return await findUserStatus()
        if(userStatus === 0) return await setPassword()
        if(userStatus === 1) return await loggIn()

    }

</script>
<div class="w-full min-h-screen flex flex-col items-center justify-center">
    <div class="w-full flex flex-row justify-center">
        <Card.Root class="w-full max-w-sm">
          <Card.Header>
            <div class=" flex flex-row justify-center">
                <img src={logo} alt="UDO" class="w-30 h-30"/>

            </div>
            <Card.Title class="text-center text-xl">SRCA - UDO Monagas</Card.Title>            
          </Card.Header>
          <Card.Content>
            <form onsubmit={(ev)=>{ev.preventDefault();callSubmitFunc()}}>
              <div class="flex flex-col gap-6">
                <div class="grid gap-2">
                  <Label for="ci">Cédula</Label>
                  <Input bind:value={form.ci} disabled={loadingText!=='' || userStatus !== null} id="ci" type="numcer" placeholder="XXXXXXXXX" required />
                </div>
                {#if userStatus === 0 || userStatus === 1}
                <div class="grid gap-2">
                    <div class="flex items-center">
                    <Label for="password">Ingrese su Contraseña</Label>                    
                  </div>
                    <InputGroup.Root>
                        <InputGroup.Input bind:value={form.password} name="password" type={ displayPassword ? 'text' : 'password' } />
                        <InputGroup.Addon align="inline-end">
                        <InputGroup.Button
                            aria-label="Show-1"
                            title="Show1-"
                            size="icon-xs"
                            onclick={() => displayPassword = !displayPassword}
                        >
                            {#if displayPassword}
                            <EyeOffIcon />
                            {:else}
                            <EyeIcon />
                            {/if}
                        </InputGroup.Button>
                        </InputGroup.Addon>
                    </InputGroup.Root>
                </div>
                {/if}
                {#if userStatus === 0}
                <div class="grid gap-2">
                  <div class="flex items-center">
                    <Label for="password2">Repita su Contraseña</Label>                    
                  </div>
                  <InputGroup.Root>
                    <InputGroup.Input bind:value={form.repeatPassword} name="password2" type={ displayPassword ? 'text' : 'password' } />
                    <InputGroup.Addon align="inline-end">
                    <InputGroup.Button
                        aria-label="Show-2"
                        title="Show2-"
                        size="icon-xs"
                        onclick={() => displayPassword = !displayPassword}
                    >
                        {#if displayPassword}
                        <EyeOffIcon />
                        {:else}
                        <EyeIcon />
                        {/if}
                    </InputGroup.Button>
                    </InputGroup.Addon>
                </InputGroup.Root>
                </div>
                {/if}
              </div>
            </form>
            {#if loadingText !==''}

            <div class="w-full flex flex-row mt-4 items-center justify-center space-x-2">
                <Spinner class="size-5 text-blue-800"/>
                <span class="font-semibold">
                    {loadingText}
                </span>
            </div>

            {/if}
          </Card.Content>
          <Card.Footer class="flex-col gap-2">
            {#if userStatus === null}
            <Button onclick={findUserStatus} disabled={loadingText!==''} class="w-full">Confirmar</Button>
            {:else if userStatus === 0}
            <Button onclick={setPassword} disabled={loadingText!=='' || (form.repeatPassword === "" || form.password === "" ) || (form.repeatPassword !== form.password) } class="w-full">Confirmar Contraseña e Iniciar Sesión</Button>
            {:else if userStatus === 1}
            <Button onclick={loggIn} disabled={loadingText!==''} class="w-full">Iniciar Sesión</Button>
            {/if}
            </Card.Footer> 
        </Card.Root>
    </div>  
</div>