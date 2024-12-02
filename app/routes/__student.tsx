import {ArrowLeftOnRectangleIcon} from '@heroicons/react/24/solid'

import {
	Anchor,
	Avatar,
	Button,
	Divider,
	Menu,
	Modal,
	ScrollArea,
	TextInput,
} from '@mantine/core'
import {useDisclosure} from '@mantine/hooks'
import type {LoaderArgs, SerializeFrom} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {Form, Link, Outlet, useFetcher} from '@remix-run/react'
import appConfig from 'app.config'
import React from 'react'
import {TailwindContainer} from '~/components/TailwindContainer'
import {db} from '~/db.server'
import {isAdmin, isFaculty, requireUserId} from '~/session.server'
import {useUser} from '~/utils/hooks'

export type StudentLoaderData = SerializeFrom<typeof loader>
export const loader = async ({request}: LoaderArgs) => {
	const studentId = await requireUserId(request)

	if (await isAdmin(request)) {
		return redirect('/admin')
	} else if (await isFaculty(request)) {
		return redirect('/faculty')
	}

	const schedules = await db.studentSchedule.findMany({
		where: {studentId},
		include: {
			tests: true,
			section: {
				include: {
					course: true,
					faculty: true,
					room: true,
				},
			},
		},
	})

	const allSections = await db.section.findMany({
		include: {
			course: true,
			faculty: true,
			room: true,
		},
	})

	return json({
		schedules,
		allSections,
	})
}

export default function AppLayout() {
	return (
		<>
			<div className="flex h-full flex-col">
				<HeaderComponent />
				<ScrollArea classNames={{root: 'flex-1'}}>
					<Content />
				</ScrollArea>
				<FooterComponent />
			</div>
		</>
	)
}

function HeaderComponent() {
	const {user} = useUser()

	const hasResetPassword = Boolean(user.lastPasswordResetAt)
	const [isModalOpen, handleModal] = useDisclosure(!hasResetPassword)

	const fetcher = useFetcher()
	const isSubmitting = fetcher.state !== 'idle'
	React.useEffect(() => {
		if (fetcher.type !== 'done') {
			return
		}

		if (!fetcher.data.success) {
			return
		}

		handleModal.close()
	}, [fetcher.data, fetcher.type, handleModal])

	return (
		<>
			<Form replace action="/api/auth/logout" method="post" id="logout-form" />
			<header className="h-[80px] bg-blue-500 p-4">
				<TailwindContainer>
					<div className="flex h-full w-full items-center justify-between">
						<div className="flex flex-shrink-0 items-center gap-4">
							<Anchor component={Link} to="/">
								<img
									className="h-12 object-cover object-center"
									src={appConfig.logo}
									alt="Logo"
								/>
							</Anchor>
						</div>

						<div className="flex items-center gap-4">
							<Button
								component={Link}
								to="/"
								variant="light"
								size="sm"
								color="dark"
							>
								Courses
							</Button>

							<Button
								component={Link}
								to="/join-classes"
								variant="light"
								size="sm"
								color="dark"
							>
								All Classes
							</Button>
						</div>

						<div className="flex items-center gap-4">
							<Menu
								position="bottom-start"
								withArrow
								transition="pop-top-right"
							>
								<Menu.Target>
									<button>
										{user ? (
											<Avatar color="blue" size="md">
												{user.name.charAt(0)}
											</Avatar>
										) : (
											<Avatar />
										)}
									</button>
								</Menu.Target>

								<Menu.Dropdown>
									<Menu.Item disabled>
										<div className="flex flex-col">
											<p>{user.name}</p>
											<p className="mt-0.5 text-sm">{user.email}</p>
										</div>
									</Menu.Item>
									<Divider />

									<Menu.Item
										icon={<ArrowLeftOnRectangleIcon className="h-4 w-4" />}
										type="submit"
										form="logout-form"
									>
										Logout
									</Menu.Item>
								</Menu.Dropdown>
							</Menu>
						</div>
					</div>
				</TailwindContainer>
			</header>

			<Modal
				opened={isModalOpen}
				onClose={handleModal.close}
				title="Reset Password"
				centered
				overlayBlur={1}
				overlayOpacity={0.5}
				withCloseButton={!hasResetPassword}
				closeOnEscape={!hasResetPassword}
				closeOnClickOutside={!hasResetPassword}
			>
				<fetcher.Form
					method="post"
					replace
					className="flex flex-col gap-4"
					action="/api/reset-password"
				>
					<div className="mt-6 grid grid-cols-2 gap-4">
						<input hidden name="userId" defaultValue={user.id} />
						<TextInput
							required
							name="password"
							type="password"
							placeholder="Password"
						/>

						<Button
							variant="filled"
							type="submit"
							fullWidth
							loading={isSubmitting}
							loaderPosition="right"
						>
							Update
						</Button>
					</div>
				</fetcher.Form>
			</Modal>
		</>
	)
}

function Content() {
	return (
		<main>
			<Outlet />
		</main>
	)
}

function FooterComponent() {
	return <footer></footer>
}
