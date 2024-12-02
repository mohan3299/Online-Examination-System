import {Button, Drawer, NumberInput, Select, TextInput} from '@mantine/core'
import {useDisclosure} from '@mantine/hooks'
import type {User} from '@prisma/client'
import type {ActionFunction, LoaderArgs} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {Link, useFetcher, useLoaderData} from '@remix-run/react'
import * as React from 'react'
import {z} from 'zod'
import {TailwindContainer} from '~/components/TailwindContainer'
import {db} from '~/db.server'
import {requireUserId} from '~/session.server'
import {badRequest} from '~/utils/misc.server'
import type {inferErrors} from '~/utils/validation'
import {validateAction} from '~/utils/validation'

export const loader = async ({request}: LoaderArgs) => {
	const facultyId = await requireUserId(request)

	const sections = await db.section.findMany({
		where: {
			facultyId,
		},
		include: {
			course: true,
			tests: true,
		},
	})

	const students = await db.user.findMany({
		where: {
			role: 'STUDENT',
		},
	})

	return json({sections, students})
}

const AddQuizSchema = z.object({
	sectionId: z.string().min(1, 'Section is required'),
	name: z.string().min(1, 'Name is required'),
	description: z.string().min(1, 'Description is required'),
	maxAttempts: z.preprocess(
		Number,
		z.number().min(1, 'Max attempts is required')
	),
})

interface ActionData {
	success: boolean
	fieldErrors?: inferErrors<typeof AddQuizSchema>
}

export const action: ActionFunction = async ({request}) => {
	const {fields, fieldErrors} = await validateAction(request, AddQuizSchema)

	if (fieldErrors) {
		return badRequest<ActionData>({success: false, fieldErrors})
	}

	const test = await db.test.create({
		data: {
			sectionId: fields.sectionId,
			name: fields.name,
			description: fields.description,
			maxAttempts: fields.maxAttempts,
			slug:
				Math.random().toString(36).substring(2, 15) +
				Math.random().toString(36).substring(2, 15),
		},
	})

	// const studentsInSection = await db.studentSchedule.findMany({
	// 	where: {
	// 		sectionId: fields.sectionId,
	// 	},
	// 	include: {},
	// })

	// for (const student of studentsInSection) {
	// 	await db.enrollmentTest.create({
	// 		data: {
	// 			attempts: 0,
	// 			status: 'NOT_STARTED',
	// 			score: 0,
	// 			testId: test.id,
	// 			enrollmentId: student.id,
	// 		},
	// 	})
	// }

	return redirect(`/faculty/tests/${test.slug}`)
}

export default function ManageZones() {
	const {sections} = useLoaderData<typeof loader>()
	const fetcher = useFetcher<ActionData>()
	const isSubmitting = fetcher.state !== 'idle'

	const [sectionId, setSectionId] = React.useState<User['id'] | null>(null)

	const selectedSection = React.useMemo(
		() => sections.find(section => section.id === sectionId),
		[sections, sectionId]
	)

	const [addNewQuizDrawer, handleAddNewQuizDrawer] = useDisclosure(false)
	return (
		<>
			<TailwindContainer className="">
				<div className="mt-8 px-8">
					<div className="sm:flex sm:flex-auto sm:items-center sm:justify-between">
						<div>
							<h1 className="text-3xl font-semibold text-gray-900">Quizzes</h1>
						</div>
						<div className="flex items-end gap-4">
							<div className="flex items-end gap-4">
								<Select
									label="Section"
									value={sectionId}
									onChange={setSectionId}
									clearable
									searchable
									placeholder="Select a section"
									data={sections.map(section => ({
										value: section.id,
										label: `${section.name} (${section.course.name})`,
									}))}
								/>

								{sectionId && (
									<Button onClick={() => handleAddNewQuizDrawer.open()}>
										Add new quiz
									</Button>
								)}
							</div>
						</div>
					</div>
					<div className="mt-8 flex flex-col">
						<div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
							<div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
								{sectionId && selectedSection ? (
									<>
										{selectedSection.tests.length > 0 ? (
											<>
												{selectedSection.tests.map(test => (
													<div
														key={test.id}
														className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4 sm:px-6"
													>
														<div className="flex items-center">{test.name}</div>
														<div className="flex items-center gap-4">
															<Button
																variant="subtle"
																size="sm"
																component={Link}
																to={`../scores/${test.slug}`}
															>
																View Scores
															</Button>

															<Button
																variant="subtle"
																size="sm"
																component={Link}
																to={`../tests/${test.slug}`}
															>
																Edit
															</Button>
														</div>
													</div>
												))}
											</>
										) : (
											<div className="flex flex-col items-center justify-center rounded border border-dashed border-gray-400 py-12">
												<div className="text-sm font-medium italic text-gray-900">
													No quiz found
												</div>
											</div>
										)}
									</>
								) : (
									<div className="flex flex-col items-center justify-center rounded border border-dashed border-gray-400 py-12">
										<div className="text-sm font-medium italic text-gray-900">
											Please select a section to see all the quizzes
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</TailwindContainer>

			<Drawer
				opened={addNewQuizDrawer}
				onClose={() => handleAddNewQuizDrawer.close()}
				title="Add new quiz"
				position="left"
				padding="md"
			>
				<fetcher.Form method="post" replace className="flex flex-col gap-4">
					<input
						hidden
						readOnly
						name="sectionId"
						defaultValue={sectionId ?? ''}
					/>
					<TextInput label="name" name="name" required />
					<TextInput label="description" name="description" required />
					<NumberInput
						label="Max attempts"
						name="maxAttempts"
						required
						defaultValue={1}
						min={1}
					/>
					<Button type="submit" loading={isSubmitting}>
						Add quiz
					</Button>
				</fetcher.Form>
			</Drawer>
		</>
	)
}
