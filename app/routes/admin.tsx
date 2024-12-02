import {ArrowLeftOnRectangleIcon} from '@heroicons/react/24/solid'

import {Anchor, Avatar, Button, Divider, Menu, ScrollArea} from '@mantine/core'
import {UserRole} from '@prisma/client'
import type {LoaderArgs, SerializeFrom} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {Form, Link, Outlet} from '@remix-run/react'
import appConfig from 'app.config'
import {Footer} from '~/components/Footer'
import {TailwindContainer} from '~/components/TailwindContainer'
import {db} from '~/db.server'
import {isFaculty, isStudent, requireUser} from '~/session.server'
import {useUser} from '~/utils/hooks'

export type AdminLoaderData = SerializeFrom<typeof loader>
export const loader = async ({request}: LoaderArgs) => {
	await requireUser(request)

	if (await isStudent(request)) {
		return redirect('/')
	} else if (await isFaculty(request)) {
		return redirect('/faculty')
	}

	const courses = await db.course.findMany({
		include: {
			sections: true,
		},
	})

	const rooms = await db.room.findMany({
		include: {
			sections: true,
		},
	})

	const faculties = await db.user.findMany({
		where: {
			role: UserRole.FACULTY,
		},
		include: {
			sections: true,
			schedules: true,
		},
	})

	const sections = await db.section.findMany({
		include: {
			course: true,
			room: true,
			faculty: true,
			timeSlot: true,
		},
	})

	const students = await db.user.findMany({
		where: {
			role: UserRole.STUDENT,
		},
		include: {
			schedules: {
				include: {
					section: {
						include: {
							course: true,
							faculty: true,
						},
					},
				},
			},
		},
	})

	return json({
		courses,
		rooms,
		faculties,
		sections,
		students,
	})
}

export default function AdminAppLayout() {
	return (
		<div className="flex h-full flex-col">
			<HeaderComponent />
			<ScrollArea classNames={{root: 'flex-1'}}>
				<main>
					<Outlet />
				</main>
			</ScrollArea>
			<Footer />
		</div>
	)
}

function HeaderComponent() {
	const {user} = useUser()

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
								to="/admin"
								variant="light"
								size="sm"
								color="dark"
							>
								Courses
							</Button>

							<Button
								component={Link}
								to="/admin/room"
								variant="light"
								size="sm"
								color="dark"
							>
								Rooms
							</Button>

							<Button
								component={Link}
								to="/admin/sections"
								variant="light"
								size="sm"
								color="dark"
							>
								Sections
							</Button>

							<Button
								component={Link}
								to="/admin/students"
								variant="light"
								size="sm"
								color="dark"
							>
								Students
							</Button>

							<Button
								component={Link}
								to="/admin/faculty"
								variant="light"
								size="sm"
								color="dark"
							>
								Faculty
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
										<Avatar color="blue" size="md">
											{user.name.charAt(0)}
										</Avatar>
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
		</>
	)
}
