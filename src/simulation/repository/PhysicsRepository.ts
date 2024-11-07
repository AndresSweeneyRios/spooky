import {
  SimulationRepository,
  SimulationComponent,
} from "./_repository"

import {
  EntId,
} from "../EntityRegistry"

import {
  vec3,
} from "gl-matrix"

import * as THREE from "three"

const TERMINAL_VELOCITY = 50
const GRAVITY = -9.81

const RAPIER = await import("@dimforge/rapier3d")

class PhysicsComponent extends SimulationComponent {
  public colliders: InstanceType<typeof RAPIER.Collider>[] = []
  public characters: InstanceType<typeof RAPIER.KinematicCharacterController>[] = []
  public bodies: InstanceType<typeof RAPIER.RigidBody>[] = []

  public previousPosition: vec3 = vec3.create()
  public verticalVelocity: number = 0
  public affectedByGravity: boolean = false
}

export class PhysicsRepository extends SimulationRepository<PhysicsComponent> {
  world: InstanceType<typeof RAPIER.World> = new RAPIER.World(new RAPIER.Vector3(0, -9.81, 0))

  public GetPosition(entId: EntId): vec3 {
    const component = this.entities.get(entId)!
    
    if (component.bodies.length > 0) {
      const position = component.bodies[0].translation()
      return vec3.fromValues(position.x, position.y, position.z)
    } else if (component.colliders.length > 0) {
      const position = component.colliders[0].translation()
      return vec3.fromValues(position.x, position.y, position.z)
    } else {
      throw new Error("No collider or body found")
    }
  }

  public GetPreviousPosition(entId: EntId): vec3 {
    return vec3.clone(this.entities.get(entId)!.previousPosition)
  }

  public SetPreviousPosition(entId: EntId, position: vec3) {
    this.entities.get(entId)!.previousPosition = vec3.clone(position)
  }

  public SetAffectedByGravity(entId: EntId, affectedByGravity: boolean) {
    this.entities.get(entId)!.affectedByGravity = affectedByGravity
  }

  public TickWorld() {
    this.world.step()
  }

  public CreateCharacterController(entId: EntId, position: vec3, size: number, offset: number) {
    const character = this.world.createCharacterController(offset)
    character.setMaxSlopeClimbAngle(45)
    character.enableAutostep(1, 0.01, true)
    character.disableSnapToGround()

    const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    rigidBodyDesc.setTranslation(position[0], position[1], position[2])
    const rigidBody = this.world.createRigidBody(rigidBodyDesc)
    rigidBody.lockRotations(true, true)
    rigidBody.setLinearDamping(0.0)
    rigidBody.setAngularDamping(0.0)
    const colliderDesc = RAPIER.ColliderDesc.ball(size)
    const collider = this.world.createCollider(colliderDesc, rigidBody)
    collider.setFriction(0.0)

    this.entities.get(entId)!.colliders.push(collider)
    this.entities.get(entId)!.characters.push(character)
    this.entities.get(entId)!.bodies.push(rigidBody)
  }

  public ApplyGravity(entId: EntId, deltaTime: number) {
    if (!this.entities.get(entId)!.affectedByGravity) {
      return
    }

    const component = this.entities.get(entId)!
    const collider = component.colliders[0]
    const character = component.characters[0]
    const body = component.bodies[0]
    component.verticalVelocity += GRAVITY * deltaTime

    if (component.verticalVelocity < -TERMINAL_VELOCITY) {
      component.verticalVelocity = -TERMINAL_VELOCITY
    } else if (component.verticalVelocity > TERMINAL_VELOCITY) {
      component.verticalVelocity = TERMINAL_VELOCITY
    }

    character.computeColliderMovement(collider, new RAPIER.Vector3(0, component.verticalVelocity, 0))

    const computedMovement = character.computedMovement()

    const currentTranslation = body.translation()

    const nextTranslation = new RAPIER.Vector3(
      currentTranslation.x,
      currentTranslation.y + computedMovement.y,
      currentTranslation.z
    )

    body.setNextKinematicTranslation(nextTranslation)
    
    component.verticalVelocity = computedMovement.y
  }

  public ApplyAllGravity(deltaTime: number) {
    for (const [entId] of this.entities) {
      this.ApplyGravity(entId, deltaTime)
    }
  }

  public TryMoveCharacterController(entId: EntId, direction: vec3) {
    const desiredMovement = new RAPIER.Vector3(direction[0], direction[1], direction[2])

    const component = this.entities.get(entId)!

    const character = component.characters[0]
    const collider = component.colliders[0]
    const body = component.bodies[0]

    character.computeColliderMovement(collider, desiredMovement)

    const computedMovement = character.computedMovement()

    const currentTranslation = body.translation()

    const nextTranslation = new RAPIER.Vector3(
      currentTranslation.x + computedMovement.x,
      currentTranslation.y + computedMovement.y,
      currentTranslation.z + computedMovement.z
    )

    body.setNextKinematicTranslation(nextTranslation)
  }

  public RemoveComponent(entId: EntId): void {
    super.RemoveComponent(entId)

    for (const collider of this.entities.get(entId)!.colliders) {
      this.world.removeCollider(collider, false)
    }

    for (const character of this.entities.get(entId)!.characters) {
      this.world.removeCharacterController(character)
    }

    for (const body of this.entities.get(entId)!.bodies) {
      this.world.removeRigidBody(body)
    }
  }

  public AddMeshCollider(entId: EntId, vertices: Float32Array, indices: Uint32Array) {
    const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
    const collider = this.world.createCollider(colliderDesc)

    this.entities.get(entId)!.colliders.push(collider)

    return collider
  }

  public AddSceneColliders(entId: EntId, object: THREE.Object3D) {
    object.traverse((object) => {
      if (object.type !== "Mesh") {
        return
      }

      const geometry = (object as THREE.Mesh).geometry as THREE.BufferGeometry
      const vertices = geometry.getAttribute("position").array as Float32Array
      const indices = geometry.getIndex()!.array as Uint32Array

      const collider = this.AddMeshCollider(entId, vertices, indices)

      collider.setTranslation(new RAPIER.Vector3(object.position.x, object.position.y, object.position.z))
    })
  }

  public static Factory() {
    return new PhysicsRepository(new PhysicsComponent())
  }
}
