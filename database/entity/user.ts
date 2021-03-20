import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm'

@Entity()
export default class user {
  @PrimaryColumn()
  id: string

  @Column()
  accountType: 'vendor' | 'user' | 'admin' = 'user'

  @Column()
  status: 'active' | 'suspended' | 'deleted' = 'active'

  @Column()
  name: string = ''

  @Column()
  email: string = ''

  @Column('text', { array: true })
  contactNumbers: Array<string> = []

  @Column('text', { array: true })
  photos: Array<string> = []

  @Column()
  address: string = ''

  @Column('json')
  permission = {
    createVenue: false
  }
}
