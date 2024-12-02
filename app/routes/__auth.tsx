import type {LoaderFunction} from '@remix-run/node'
import {redirect} from '@remix-run/node'
import {Outlet} from '@remix-run/react'
import {getUser} from '~/session.server'

export const loader: LoaderFunction = async ({request}) => {
	const user = await getUser(request)
	if (user) return redirect('/')

	return null
}

export default function AuthLayout() {
	return (
		<>
			<div className="relative flex min-h-full">
				<div className="relative flex w-full items-center justify-center bg-gray-100">
					<div className="mx-auto w-full max-w-md place-items-center rounded-lg border bg-white/90 px-6 py-6">
						<Outlet />
					</div>
				</div>
			</div>
		</>
	)
}
