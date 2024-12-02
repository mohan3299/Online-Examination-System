import {Button, Drawer, NativeSelect, TextInput, Textarea} from '@mantine/core'
import {useDisclosure} from '@mantine/hooks'
import type {ActionFunction, LoaderArgs} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {useFetcher, useLoaderData} from '@remix-run/react'
import * as React from 'react'
import {z} from 'zod'
import {TailwindContainer} from '~/components/TailwindContainer'
import {db} from '~/db.server'
import {badRequest} from '~/utils/misc.server'
import type {inferErrors} from '~/utils/validation'
import {validateAction} from '~/utils/validation'

export const loader = async ({request, params}: LoaderArgs) => {
	const {testSlug} = params

	if (!testSlug) {
		return redirect('/faculty/tests')
	}

	const test = await db.test.findUnique({
		where: {
			slug: testSlug,
		},
		include: {
			questions: true,
			section: true,
			students: true,
		},
	})

	if (!test) {
		return redirect('/faculty/tests')
	}

	return json({testSlug, test})
}

const AddQuizSchema = z.object({
	testId: z.string().min(1, 'Test is required'),
	question: z.string().min(1, 'Question is required'),
	option1: z.string().min(1, 'Option 1 is required'),
	option2: z.string().min(1, 'Option 2 is required'),
	option3: z.string().min(1, 'Option 3 is required'),
	option4: z.string().min(1, 'Option 4 is required'),
	answer: z.preprocess(Number, z.number().min(1, 'Answer is required')),
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

	const options = [
		fields.option1,
		fields.option2,
		fields.option3,
		fields.option4,
	]

	await db.question.create({
		data: {
			testId: fields.testId,
			question: fields.question,
			options,
			answer: fields.answer,
		},
	})

	return json({success: true})
}

export default function ManageZones() {
	const {test} = useLoaderData<typeof loader>()
	const fetcher = useFetcher<ActionData>()
	const isSubmitting = fetcher.state !== 'idle'

	const [addNewQuestionDrawer, handleAddNewQuestionDrawer] =
		useDisclosure(false)

	React.useEffect(() => {
		if (fetcher.state !== 'idle' && fetcher.submission === undefined) {
			return
		}

		if (fetcher.data?.success) {
			handleAddNewQuestionDrawer.close()
		}
		// handleModal is not meemoized, so we don't need to add it to the dependency array
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetcher.data?.success, fetcher.state, fetcher.submission])
	return (
		<>
			<TailwindContainer className="">
				<div className="px-8">
					<div className="mt-8 sm:flex sm:flex-auto sm:items-center sm:justify-between">
						<div>
							<h1 className="text-3xl font-semibold text-gray-900">Quizzes</h1>
						</div>
						<div className="flex items-end gap-4">
							<div className="flex items-end gap-4">
								<Button onClick={() => handleAddNewQuestionDrawer.open()}>
									Add new question
								</Button>
							</div>
						</div>
					</div>
					<div className="mt-8 flex flex-col">
						<div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
							<div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
								{test.questions.length > 0 ? (
									<>
										{/* card - no table*/}
										<div className="overflow-hidden border-b border-gray-200 shadow sm:rounded-lg">
											<ul className="divide-y divide-gray-200">
												{test.questions.map(question => (
													<li key={question.id}>
														<div className="block hover:bg-gray-50">
															<div className="px-4 py-4 sm:px-6">
																<div className="flex items-center justify-between">
																	<div className="truncate text-sm font-medium text-indigo-600">
																		{question.question}
																	</div>

																	<div className="ml-2 flex flex-shrink-0">
																		<p className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
																			{question.answer}
																		</p>
																	</div>
																</div>

																<div className="mt-2 sm:flex sm:justify-between">
																	<div className="sm:flex">
																		<p className="flex items-center text-sm text-gray-500">
																			{question.options[0]}
																		</p>
																		<p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
																			{question.options[1]}
																		</p>
																		<p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
																			{question.options[2]}
																		</p>
																		<p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
																			{question.options[3]}
																		</p>
																	</div>
																</div>
															</div>
														</div>
													</li>
												))}
											</ul>
										</div>
									</>
								) : (
									<div className="flex flex-col items-center justify-center rounded border border-dashed border-gray-400 py-12">
										<div className="text-sm font-medium italic text-gray-900">
											No questions yet
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</TailwindContainer>

			<Drawer
				opened={addNewQuestionDrawer}
				onClose={() => handleAddNewQuestionDrawer.close()}
				title="Add new question"
				position="left"
				padding="md"
			>
				<fetcher.Form method="post" replace className="flex flex-col gap-4">
					<input hidden readOnly name="testId" defaultValue={test.id} />
					<Textarea label="Question" name="question" required />
					<TextInput label="Option 1" name="option1" required />
					<TextInput label="Option 2" name="option2" required />
					<TextInput label="option 3" name="option3" required />
					<TextInput label="Option 4" name="option4" required />

					<NativeSelect
						label="Correct answer"
						name="answer"
						required
						data={[1, 2, 3, 4].map(i => ({
							label: `Option ${i}`,
							value: i.toString(),
						}))}
					/>
					<Button type="submit" loading={isSubmitting}>
						Add question
					</Button>
				</fetcher.Form>
			</Drawer>
		</>
	)
}
