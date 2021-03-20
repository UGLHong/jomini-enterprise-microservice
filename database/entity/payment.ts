import { Entity, Column, PrimaryColumn } from 'typeorm'
import shortId from 'shortid'

@Entity()
export default class payment {
  @PrimaryColumn()
  id: string = 'V_' + shortId.generate()

  @Column()
  orderId: string
}
